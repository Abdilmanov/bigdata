<?php
$address = urlencode($_GET["address"]);
$xml = file_get_contents("http://127.0.0.1:8081/get?address=".$address);
echo $xml;
?>
