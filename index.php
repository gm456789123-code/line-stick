<?php
declare(strict_types=1);

// Root entrypoint: send users to the frontend home page.
$frontendUrl = getenv('FRONTEND_HOME_URL') ?: 'http://localhost:3000/';

header('Location: ' . $frontendUrl, true, 302);
exit;
