<?php
$folder = __DIR__ . '/../uploads/';
$webPath = '../uploads/';

$files = scandir($folder);
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RVC Uploads</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0b1020;
            color: white;
            padding: 30px;
        }

        h1 {
            margin-bottom: 25px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }

        .card {
            background: #151d30;
            border-radius: 12px;
            padding: 15px;
        }

        img {
            width: 100%;
            height: 180px;
            object-fit: cover;
            border-radius: 8px;
            background: #080c15;
        }

        .filename {
            margin-top: 12px;
            font-weight: bold;
            word-break: break-all;
        }

        .type {
            color: #9aa7bd;
            font-size: 13px;
            margin-top: 5px;
        }
    </style>
</head>

<body>

<h1>📁 RVC Uploads</h1>

<div class="grid">

<?php
foreach ($files as $file) {

    if ($file === '.' || $file === '..') {
        continue;
    }

    $fullPath = $folder . $file;

    if (!is_file($fullPath)) {
        continue;
    }

    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));

    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    echo '<div class="card">';

    if (in_array($extension, $imageExtensions)) {
        echo '<img src="' . $webPath . rawurlencode($file) . '" alt="">';
    } else {
        echo '<div style="height:180px;display:flex;align-items:center;justify-content:center;background:#080c15;border-radius:8px;">
                📄 FILE
              </div>';
    }

    echo '<div class="filename">' . htmlspecialchars($file) . '</div>';
    echo '<div class="type">' . strtoupper($extension) . '</div>';

    echo '</div>';
}
?>

</div>

</body>
</html>