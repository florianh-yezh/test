<?php
// Ar'Ty Mad — enregistre le contenu modifié dans admin.html.
//
// POST JSON, en-tête X-Admin-Password.
//   {"action": "check"}                       vérifie seulement le mot de passe
//   {"action": "save", "data": {…}}           enregistre la carte (data/menus.json)
//   {"action": "avis", "data": {…}}           enregistre le livre d'or (data/avis.json)
//   {"action": "galerie", "data": {…}}        enregistre la galerie (data/galerie.json)
//   {"action": "upload", "data": {"image": "data:image/jpeg;base64,…"}}  ajoute une photo (images/uploads/)
//   {"action": "reglages", "data": {"reservationEnLigne": true|false}}   enregistre les réglages du site
// Chaque ancienne version des fichiers de contenu est archivée dans data/archives/.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const MAX_BODY = 65536;           // contenu texte
const MAX_UPLOAD_BODY = 4718592;  // photo encodée (≈ 3,4 Mo d'image)
const MAX_IMAGE_BYTES = 3500000;
const MAX_TEXT = 300;
const KEEP_ARCHIVES = 30;
const MAX_FAILURES = 5;
const LOCK_SECONDS = 900;
const CATEGORIES = ['assiettes', 'salle', 'clients'];

$root = dirname(__DIR__);
$archiveDir = $root . '/data/archives';
$attemptsFile = __DIR__ . '/.tentatives.json';

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// Écriture atomique : le site ne lit jamais un fichier à moitié écrit.
function writeJson(string $file, array $data): void
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    $tmp = $file . '.tmp';
    if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $file)) {
        @unlink($tmp);
        reply(500, ['error' => "Le serveur n'a pas pu écrire data/" . basename($file) . " (droits d'écriture du dossier data/)."]);
    }
}

// Garde une copie de l'ancienne version (les KEEP_ARCHIVES dernières).
function archive(string $file, string $archiveDir): void
{
    if (!is_file($file)) {
        return;
    }
    if (!is_dir($archiveDir) && !@mkdir($archiveDir, 0755, true)) {
        reply(500, ['error' => "Impossible de créer le dossier d'archives sur le serveur."]);
    }
    $prefix = pathinfo($file, PATHINFO_FILENAME);
    @copy($file, "{$archiveDir}/{$prefix}-" . date('Y-m-d-His') . '.json');
    $old = glob("{$archiveDir}/{$prefix}-*.json") ?: [];
    sort($old);
    foreach (array_slice($old, 0, max(0, count($old) - KEEP_ARCHIVES)) as $f) {
        @unlink($f);
    }
}

function text(mixed $v, string $what, bool $required = false, int $max = MAX_TEXT): string
{
    if (!is_string($v)) {
        $v = '';
    }
    $v = trim(preg_replace('/\s+/u', ' ', $v) ?? '');
    if ($required && $v === '') {
        reply(422, ['error' => "Champ obligatoire manquant : {$what}."]);
    }
    if ((function_exists('mb_strlen') ? mb_strlen($v) : strlen($v)) > $max) {
        reply(422, ['error' => "Texte trop long : {$what}."]);
    }
    return $v;
}

// Une photo doit être un fichier image existant du dossier images/ du site.
function imagePath(mixed $v, string $root, string $what): string
{
    $v = is_string($v) ? trim($v) : '';
    if (!preg_match('#^images/[a-z0-9][a-z0-9/_.-]*\.(jpe?g|png|webp)$#i', $v) || str_contains($v, '..') || !is_file("{$root}/{$v}")) {
        reply(422, ['error' => "Photo introuvable sur le serveur : {$what}."]);
    }
    return $v;
}

function listOf(mixed $v, int $max): array
{
    return array_slice(is_array($v) ? array_values($v) : [], 0, $max);
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

$raw = file_get_contents('php://input', false, null, 0, MAX_UPLOAD_BODY + 1);
if ($raw === false || strlen($raw) > MAX_UPLOAD_BODY) {
    reply(413, ['error' => 'Envoi trop volumineux.']);
}
$req = json_decode($raw, true);
if (!is_array($req)) {
    reply(400, ['error' => 'Requête illisible.']);
}
$action = (string) ($req['action'] ?? '');
if ($action !== 'upload' && strlen($raw) > MAX_BODY) {
    reply(413, ['error' => 'Contenu trop volumineux.']);
}
$in = $req['data'] ?? null;

// ---------- Actions ----------

if ($action === 'check') {
    reply(200, ['ok' => true]);
}

if ($action === 'reglages') {
    $on = is_array($in) ? ($in['reservationEnLigne'] ?? null) : null;
    if (!is_bool($on)) {
        reply(422, ['error' => 'Réglage de réservation invalide.']);
    }
    $settings = ['version' => 1, 'reservationEnLigne' => $on];
    writeJson($root . '/data/reglages.json', $settings);
    reply(200, ['ok' => true, 'data' => $settings]);
}

if (!is_array($in)) {
    reply(400, ['error' => 'Action inconnue.']);
}

if ($action === 'upload') {
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', (string) ($in['image'] ?? ''), $m)) {
        reply(422, ['error' => 'Format de photo non accepté (JPEG, PNG ou WebP).']);
    }
    $bytes = base64_decode($m[2], true);
    if ($bytes === false || strlen($bytes) > MAX_IMAGE_BYTES) {
        reply(413, ['error' => 'Photo trop lourde.']);
    }
    // Le contenu doit réellement être une image, quel que soit ce qu'annonce le navigateur.
    $info = @getimagesizefromstring($bytes);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($types[$info[2]]) || $info[0] > 6000 || $info[1] > 6000) {
        reply(422, ['error' => "Ce fichier n'est pas une photo valide."]);
    }
    $dir = $root . '/images/uploads';
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        reply(500, ['error' => "Impossible de créer le dossier images/uploads sur le serveur."]);
    }
    $name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $types[$info[2]];
    if (file_put_contents("{$dir}/{$name}", $bytes, LOCK_EX) === false) {
        reply(500, ['error' => "Le serveur n'a pas pu enregistrer la photo (droits d'écriture du dossier images/)."]);
    }
    reply(200, ['ok' => true, 'src' => "images/uploads/{$name}", 'width' => $info[0], 'height' => $info[1]]);
}

if ($action === 'avis') {
    $link = text($in['lienGoogle'] ?? '', 'lien vers les avis Google', false, 600);
    if ($link !== '' && (!filter_var($link, FILTER_VALIDATE_URL) || !str_starts_with($link, 'https://'))) {
        reply(422, ['error' => 'Le lien vers les avis Google doit commencer par https://.']);
    }
    $avis = [];
    foreach (listOf($in['avis'] ?? null, 30) as $i => $a) {
        $n = $i + 1;
        if (!is_array($a)) {
            continue;
        }
        $texte = text($a['texte'] ?? '', "texte de l'avis {$n}", false, 1500);
        if ($texte === '') {
            continue;
        }
        $note = $a['note'] ?? null;
        $note = is_numeric($note) && (int) $note >= 1 && (int) $note <= 5 ? (int) $note : null;
        $photos = [];
        foreach (listOf($a['photos'] ?? null, 6) as $j => $p) {
            $photos[] = [
                'src' => imagePath(is_array($p) ? ($p['src'] ?? '') : '', $root, "avis {$n}, photo " . ($j + 1)),
                'alt' => text(is_array($p) ? ($p['alt'] ?? '') : '', "description de photo de l'avis {$n}", false, 200),
            ];
        }
        $avis[] = ['note' => $note, 'texte' => $texte, 'contexte' => text($a['contexte'] ?? '', "contexte de l'avis {$n}", false, 40), 'photos' => $photos];
    }
    $clean = ['version' => 1, 'lienGoogle' => $link, 'avis' => $avis];
    $file = $root . '/data/avis.json';
    archive($file, $archiveDir);
    writeJson($file, $clean);
    reply(200, ['ok' => true, 'savedAt' => date(DATE_ATOM), 'data' => $clean]);
}

if ($action === 'galerie') {
    $photos = [];
    foreach (listOf($in['photos'] ?? null, 120) as $i => $p) {
        $n = $i + 1;
        if (!is_array($p)) {
            continue;
        }
        $cat = (string) ($p['categorie'] ?? '');
        $photos[] = [
            'src' => imagePath($p['src'] ?? '', $root, "photo {$n} de la galerie"),
            'legende' => text($p['legende'] ?? '', "légende de la photo {$n}", false, 120),
            'categorie' => in_array($cat, CATEGORIES, true) ? $cat : 'assiettes',
            'alt' => text($p['alt'] ?? '', "description de la photo {$n}", false, 200),
        ];
    }
    $clean = ['version' => 1, 'photos' => $photos];
    $file = $root . '/data/galerie.json';
    archive($file, $archiveDir);
    writeJson($file, $clean);
    reply(200, ['ok' => true, 'savedAt' => date(DATE_ATOM), 'data' => $clean]);
}

if ($action !== 'save') {
    reply(400, ['error' => 'Action inconnue.']);
}

// ---------- Carte (menus) ----------

if (!is_array($in['menus'] ?? null) || count($in['menus']) < 1 || count($in['menus']) > 2) {
    reply(422, ['error' => 'La carte doit contenir un ou deux menus.']);
}

$menus = [];
foreach (array_values($in['menus']) as $i => $m) {
    $n = $i + 1;
    $rubriques = [];
    foreach (listOf($m['rubriques'] ?? null, 8) as $r) {
        $plats = [];
        foreach (listOf($r['plats'] ?? null, 20) as $p) {
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

$file = $root . '/data/menus.json';
archive($file, $archiveDir);
writeJson($file, $clean);
reply(200, ['ok' => true, 'savedAt' => date(DATE_ATOM), 'data' => $clean]);
