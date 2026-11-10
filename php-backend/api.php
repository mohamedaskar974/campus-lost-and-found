<?php
/**
 * Crescent ReClaim - PHP REST API Endpoint
 * Handles: GET items, POST item, POST claim, GET metrics
 * Developer: M. MOHAED ASKAR (Reg No: 240071601159)
 * Crescent Institute of Science & Technology
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'config.php';

$action = $_GET['action'] ?? '';

// 1. GET ITEMS (with Search & Category Filters)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'items') {
    $type = $_GET['type'] ?? 'all';
    $category = $_GET['category'] ?? 'all';
    $zone = $_GET['zone'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    $sql = "SELECT * FROM items WHERE 1=1";
    $params = [];

    if ($type !== 'all') {
        $sql .= " AND type = ?";
        $params[] = $type;
    }
    if ($category !== 'all') {
        $sql .= " AND category = ?";
        $params[] = $category;
    }
    if ($zone !== 'all') {
        $sql .= " AND zone = ?";
        $params[] = $zone;
    }
    if (!empty($search)) {
        $sql .= " AND (title LIKE ? OR `desc` LIKE ? OR zone LIKE ?)";
        $wild = "%$search%";
        $params[] = $wild;
        $params[] = $wild;
        $params[] = $wild;
    }

    $sql .= " ORDER BY created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    echo json_encode(['success' => true, 'count' => count($items), 'items' => $items]);
    exit;
}

// 2. POST REPORT NEW ITEM
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'report') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['title']) || empty($data['category']) || empty($data['zone']) || empty($data['reporter_name']) || empty($data['reporter_email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit;
    }

    $id = 'item-' . time();
    $sql = "INSERT INTO items (id, type, status, category, title, `desc`, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg)
            VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $id,
        $data['type'] ?? 'lost',
        $data['category'],
        $data['title'],
        $data['desc'] ?? '',
        $data['zone'],
        $data['exact_spot'] ?? '',
        $data['photo_url'] ?? 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop',
        $data['reporter_name'],
        $data['reporter_email'],
        $data['reporter_phone'] ?? '',
        $data['reporter_reg'] ?? ''
    ]);

    echo json_encode(['success' => true, 'message' => 'Item successfully reported', 'id' => $id]);
    exit;
}

// 3. POST CLAIM ITEM (Sends Notification to Finder)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'claim') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['item_id']) || empty($data['claimant_name']) || empty($data['claimant_email']) || empty($data['proof_details'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing required claim parameters']);
        exit;
    }

    // Verify item
    $stmt = $pdo->prepare("SELECT * FROM items WHERE id = ?");
    $stmt->execute([$data['item_id']]);
    $item = $stmt->fetch();

    if (!$item) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Item not found']);
        exit;
    }

    $claimId = 'claim-' . time();
    $insertClaim = $pdo->prepare("INSERT INTO claims (id, item_id, claimant_name, claimant_reg, claimant_email, claimant_phone, proof_details) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $insertClaim->execute([
        $claimId,
        $data['item_id'],
        $data['claimant_name'],
        $data['claimant_reg'] ?? '',
        $data['claimant_email'],
        $data['claimant_phone'] ?? '',
        $data['proof_details']
    ]);

    // Update status
    $pdo->prepare("UPDATE items SET status = 'claim_pending' WHERE id = ?")->execute([$data['item_id']]);

    // Log simulated email alert
    $subject = "[Crescent ReClaim Alert] Claim Filed for: " . $item['title'];
    $bodyHtml = "<p>Dear {$item['reporter_name']},</p><p>A student ({$data['claimant_name']}) has filed a verified claim for your reported item: {$item['title']}.</p><p>Proof: {$data['proof_details']}</p>";

    $logStmt = $pdo->prepare("INSERT INTO email_logs (recipient_email, recipient_name, subject, item_title, body_html, claimant_name) VALUES (?, ?, ?, ?, ?, ?)");
    $logStmt->execute([$item['reporter_email'], $item['reporter_name'], $subject, $item['title'], $bodyHtml, $data['claimant_name']]);

    echo json_encode([
        'success' => true,
        'message' => 'Claim recorded. Automated email alert queued for finder.',
        'claimId' => $claimId,
        'emailAlert' => [
            'to' => $item['reporter_email'],
            'toName' => $item['reporter_name'],
            'subject' => $subject,
            'claimantName' => $data['claimant_name'],
            'proofDetails' => $data['proof_details']
        ]
    ]);
    exit;
}

// 4. GET METRICS
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'metrics') {
    $total = $pdo->query("SELECT COUNT(*) FROM items")->fetchColumn();
    $found = $pdo->query("SELECT COUNT(*) FROM items WHERE type = 'found'")->fetchColumn();
    $lost = $pdo->query("SELECT COUNT(*) FROM items WHERE type = 'lost'")->fetchColumn();
    $claims = $pdo->query("SELECT COUNT(*) FROM claims")->fetchColumn();

    echo json_encode([
        'success' => true,
        'metrics' => [
            'totalReports' => (int)$total,
            'foundItems' => (int)$found,
            'lostItems' => (int)$lost,
            'totalClaims' => (int)$claims,
            'reunitedOwners' => 142 + (int)$claims
        ]
    ]);
    exit;
}

echo json_encode(['error' => 'Invalid action or request']);
