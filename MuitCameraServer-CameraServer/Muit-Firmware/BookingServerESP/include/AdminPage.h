#pragma once
#include <Arduino.h>

const char admin_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Настройки ESP</title>
<style>
  body { font-family: monospace; background: #111; color: #eee; margin: 0; padding: 20px; }
  h2 { color: #0df; margin: 0 0 4px 0; font-size: 16px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
  .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 12px; max-width: 420px; }
  .card-title { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; margin-top: 10px; }
  input { width: 100%; box-sizing: border-box; background: #111; border: 1px solid #333; border-radius: 4px; padding: 8px 10px; color: #eee; font-family: monospace; font-size: 14px; outline: none; }
  input:focus { border-color: #0df; }
  .row { display: flex; gap: 8px; }
  .row input:first-child { flex: 1; }
  .row input:last-child { width: 90px; flex: none; }
  button { margin-top: 12px; width: 100%; padding: 10px; border: none; border-radius: 4px; font-family: monospace; font-size: 13px; cursor: pointer; font-weight: bold; }
  .btn-save   { background: #0df; color: #111; }
  .btn-wifi   { background: #fa0; color: #111; }
  .btn-reboot { background: #222; color: #f55; border: 1px solid #f55; }
  .cur { font-size: 12px; color: #0df; background: #0d1f22; border-radius: 4px; padding: 6px 10px; margin-bottom: 12px; }
  .cur.w { color: #fa0; background: #1f1800; }
  #msg { display: none; max-width: 420px; margin-top: 10px; padding: 8px 12px; border-radius: 4px; font-size: 13px; }
  .ok  { background: #0d2a1f; color: #0f9; border: 1px solid #0f9; }
  .err { background: #2a0d11; color: #f55; border: 1px solid #f55; }
  a { color: #555; font-size: 12px; display: block; text-align: center; margin-top: 16px; max-width: 420px; }
</style>
</head>
<body>

<h2>ESP Admin</h2>
<p class="sub">Smart Cabinet System</p>

<div class="card">
  <div class="card-title">Qt TCP Сервер</div>
  <div class="cur" id="cs">Загрузка...</div>
  <label>IP</label>
  <div class="row">
    <input type="text"   id="si" placeholder="192.168.1.162" maxlength="30">
    <input type="number" id="sp" placeholder="44444" min="1" max="65535">
  </div>
  <button class="btn-save" onclick="saveServer()">Сохранить</button>
</div>

<div class="card">
  <div class="card-title">WiFi Роутер</div>
  <div class="cur w" id="cw">Загрузка...</div>
  <label>SSID</label>
  <input type="text"     id="ws" placeholder="MyRouter" maxlength="31">
  <label>Пароль</label>
  <input type="password" id="wp" placeholder="••••••••" maxlength="63">
  <button class="btn-wifi" onclick="saveWifi()">Сохранить WiFi</button>
</div>

<div class="card">
  <div class="card-title">Система</div>
  <button class="btn-reboot" onclick="reboot()">Перезагрузить ESP</button>
</div>

<div id="msg"></div>
<a href="/">← На главную</a>

<script>
fetch('/api/config').then(r=>r.json()).then(d=>{
  document.getElementById('cs').textContent=d.serverIp+':'+d.serverPort;
  document.getElementById('cw').textContent=d.wifiSsid;
  document.getElementById('si').value=d.serverIp;
  document.getElementById('sp').value=d.serverPort;
  document.getElementById('ws').value=d.wifiSsid;
}).catch(()=>{ document.getElementById('cs').textContent='Ошибка'; });

function show(text,ok){var e=document.getElementById('msg');e.textContent=text;e.className=ok?'ok':'err';e.style.display='block';setTimeout(()=>e.style.display='none',3000);}

function saveServer(){
  var ip=document.getElementById('si').value.trim();
  var port=parseInt(document.getElementById('sp').value);
  if(ip.split('.').length!==4){show('Некорректный IP',false);return;}
  if(!port||port<1||port>65535){show('Некорректный порт',false);return;}
  fetch('/admin/save-server',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'ip='+encodeURIComponent(ip)+'&port='+port})
  .then(r=>r.json()).then(d=>{
    if(d.ok){document.getElementById('cs').textContent=ip+':'+port;show('Сервер сохранён',true);}
    else show('Ошибка сохранения',false);
  }).catch(()=>show('Нет ответа',false));
}

function saveWifi(){
  var s=document.getElementById('ws').value.trim();
  var p=document.getElementById('wp').value;
  if(!s){show('Введите SSID',false);return;}
  fetch('/admin/save-wifi',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'ssid='+encodeURIComponent(s)+'&pass='+encodeURIComponent(p)})
  .then(r=>r.json()).then(d=>{
    if(d.ok){document.getElementById('cw').textContent=s;show('WiFi сохранён. Перезагрузите!',true);}
    else show('Ошибка',false);
  }).catch(()=>show('Нет ответа',false));
}

function reboot(){
  if(!confirm('Перезагрузить ESP?'))return;
  fetch('/admin/reboot',{method:'POST'}).finally(()=>show('Перезагрузка...',true));
}
</script>
</body>
</html>
)rawliteral";