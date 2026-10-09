<?php
// Ar'Ty Mad — enregistre la carte (data/menus.json) envoyée par admin.html.
//
// POST JSON, en-tête X-Admin-Password.
//   {"action": "check"}            vérifie seulement le mot de passe
//   {"action": "save", "data": {…}} enregistre la carte (l'ancienne est archivée)

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const MAX_BODY = 65536;
const MAX_TEXT = 300;
const KEEP_ARCHIVES = 30;
const MAX_FAILURES = 5;
const LOCK_SECONDS = 900;

$root = dirname(__DIR__);
$menusFile = $root . '/data/menus.json';
$archiveDir = $root . '/data/archives';
$attemptsFile = __DIR__ . '/.tentatives.json';

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(405, ['error' => 'Méthode non autorisée.']);
}

// ---------- Mot de passe ----------

$config = require __DIR__ . '/config.php';
if (empty($config['hash']) || empty($config['salt'])) {
    reply(503, ['error' => "Aucun mot de passe n'est encore configuré dans api/config.php."]);
}

// Limite les essais par adresse IP pour empêcher de deviner le mot de passe.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'inconnue';
$attempts = is_file($attemptsFile) ? (json_decode((string) file_get_contents($attemptsFile), true) ?: []) : [];
$now = time();
foreach ($attempts as $k => $a) {
    if ($now - ($a['last'] ?? 0) > LOCK_SECONDS) {
        unset($attempts[$k]);
    }
}
$mine = $attempts[$ip] ?? ['count' => 0, 'last' => 0];
if ($mine['count'] >= MAX_FAILURES) {
    $wait = (int) ceil((LOCK_SECONDS - ($now - $mine['last'])) / 60);
    reply(429, ['error' => "Trop d'essais de mot de passe. Réessayez dans {$wait} min."]);
}

$password = (string) ($_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '');
$computed = hash_pbkdf2('sha256', $password, (string) $config['salt'], (int) $config['iterations'], 64);
if ($password === '' || !hash_equals((string) $config['hash'], $computed)) {
    $attempts[$ip] = ['count' => $mine['count'] + 1, 'last' => $now];
    @file_put_contents($attemptsFile, json_encode($attempts), LOCK_EX);
    reply(401, ['error' => 'Mot de passe incorrect.']);
}
if (isset($attempts[$ip])) {
    unset($attempts[$ip]);
    @file_put_contents($attemptsFile, json_encode($attempts), LOCK_EX);
}

// ---------- Requête ----------

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($raw === false || strlen($raw) > MAX_BODY) {
    reply(413, ['error' => 'Carte trop volumineuse.']);
}
$req = json_decode($raw, true);
if (!is_array($req)) {
    reply(400, ['error' => 'Requête illisible.']);
}
if (($req['action'] ?? '') === 'check') {
    reply(200, ['ok' => true]);
}
if (($req['action'] ?? '') !== 'save' || !is_array($req['data'] ?? null)) {
    reply(400, ['error' => 'Action inconnue.']);
}

// ---------- Vérification de la carte ----------

function text(mixed $v, string $what, bool $required = false): string
{
    if (!is_string($v)) {
        $v = '';
    }
    $v = trim(preg_replace('/\s+/u', ' ', $v) ?? '');
    if ($required && $v === '') {
        reply(422, ['error' => "Champ obligatoire manquant : {$what}."]);
    }
    if ((function_exists('mb_strlen') ? mb_strlen($v) : strlen($v)) > MAX_TEXT) {
        reply(422, ['error' => "Texte trop long : {$what}."]);
    }
    return $v;
}

$in = $req['data'];
if (!is_array($in['menus'] ?? null) || count($in['menus']) < 1 || count($in['menus']) > 2) {
    reply(422, ['error' => 'La carte doit contenir un ou deux menus.']);
}

$menus = [];
foreach (array_values($in['menus']) as $i => $m) {
    $n = $i + 1;
    $rubriques = [];
    foreach (array_slice(is_array($m['rubriques'] ?? null) ? $m['rubriques'] : [], 0, 8) as $r) {
        $plats = [];
        foreach (array_slice(is_array($r['plats'] ?? null) ? $r['plats'] : [], 0, 20) as $p) {
            $p = text($p, "plat du menu {$n}");
            if ($p !== '') {
                $plats[] = $p;
            }
        }
        if ($plats) {
            $rubriques[] = ['titre' => text($r['titre'] ?? '', "rubrique du menu {$n}"), 'plats' => $plats];
        }
    }
    if (!$rubriques) {
        reply(422, ['error' => "Le menu {$n} ne contient aucun plat."]);
    }
    $menus[] = [
        'nom' => text($m['nom'] ?? '', "nom du menu {$n}", true),
        'prix' => text($m['prix'] ?? '', "prix du menu {$n}", true),
        'rubriques' => $rubriques,
        'pied' => text($m['pied'] ?? '', "phrase du menu {$n}"),
    ];
}

$e = is_array($in['enfant'] ?? null) ? $in['enfant'] : [];
$clean = [
    'version' => 1,
    'menus' => $menus,
    'enfant' => [
        'nom' => text($e['nom'] ?? '', 'nom du menu enfant'),
        'prix' => text($e['prix'] ?? '', 'prix du menu enfant'),
        'condition' => text($e['condition'] ?? '', 'condition du menu enfant'),
        'contenu' => text($e['contenu'] ?? '', 'contenu du menu enfant'),
        'citation' => text($e['citation'] ?? '', 'phrase du menu enfant'),
    ],
    'note' => text($in['note'] ?? '', 'mention sous les menus'),
];

// ---------- Enregistrement ----------

if (!is_dir($archiveDir) && !@mkdir($archiveDir, 0755, true)) {
    reply(500, ['error' => "Impossible de créer le dossier d'archives sur le serveur."]);
}
if (is_file($menusFile)) {
    @copy($menusFile, $archiveDir . '/menus-' . date('Y-m-d-His') . '.json');
    $old = glob($archiveDir . '/menus-*.json') ?: [];
    sort($old);
    foreach (array_slice($old, 0, max(0, count($old) - KEEP_ARCHIVES)) as $f) {
        @unlink($f);
    }
}

$json = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
$tmp = $menusFile . '.tmp';
if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $menusFile)) {
    @unlink($tmp);
    reply(500, ['error' => "Le serveur n'a pas pu écrire data/menus.json (droits d'écriture du dossier data/)."]);
}

reply(200, ['ok' => true, 'savedAt' => date(DATE_ATOM), 'data' => $clean]);
