#pragma once
#include <Arduino.h>

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Панель Мониторинга</title>
    <style>
        :root {
            --bg-color: #f0f2f5;
            --card-bg: #ffffff;
            --primary-color: #4361ee;
            --accent-color: #3f37c9;
            --text-main: #2b2d42;
            --text-secondary: #8d99ae;
            --danger: #ef233c;
            --success: #06d6a0;
        }

        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: var(--bg-color); 
            color: var(--text-main);
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }

        .dashboard {
            width: 90%;
            max-width: 800px;
            background: var(--card-bg);
            padding: 30px;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid var(--bg-color);
            padding-bottom: 15px;
        }

        h1 { font-size: 22px; margin: 0; color: var(--primary-color); }

        .status-badge {
            font-size: 12px;
            padding: 5px 12px;
            border-radius: 20px;
            background: #e8f5e9;
            color: var(--success);
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .section-title {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-secondary);
            margin-bottom: 15px;
        }

        .grid { 
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
            min-height: 70px;
        }

        .cab-box { 
            background: var(--card-bg);
            border: 2px solid var(--primary-color);
            color: var(--primary-color);
            border-radius: 15px;
            height: 70px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            animation: fadeIn 0.5s ease forwards;
        }

        .cab-box span { font-size: 10px; text-transform: uppercase; opacity: 0.7; }
        .cab-box div { font-size: 24px; }

        .last-request-card {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            padding: 25px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 6px 20px rgba(67, 97, 238, 0.3);
        }

        .last-request-card .label { font-size: 14px; opacity: 0.8; margin-bottom: 10px; }
        .last-request-card .value { font-size: 48px; font-weight: 800; }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        #grid:empty::after {
            content: "Все кабинеты свободны";
            color: var(--text-secondary);
            font-style: italic;
            grid-column: 1 / -1;
            text-align: center;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <header>
            <h1>Smart Cabinet System</h1>
            <div class="status-badge">
                <div class="status-dot"></div> ONLINE
            </div>
        </header>

        <div class="section-title">Занятые кабинеты</div>
        <div id="grid" class="grid"></div>

        <div class="last-request-card">
            <div class="label">Последний запрос на бронь</div>
            <div class="value" id="last-cab">0</div>
        </div>
    </div>

    <script>
        function refresh() {
            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    // 1. Обновляем сетку занятых кабинетов
                    const grid = document.getElementById('grid');
                    grid.innerHTML = '';
                    
                    // Проходим по массиву 'cabinets', который прислал сервер
                    if (data.cabinets && Array.isArray(data.cabinets)) {
                        data.cabinets.forEach(c => {
                            // Сервер присылает { "num": X, "isBusy": true/false }
                            if(c.isBusy === true) {
                                const box = document.createElement('div');
                                box.className = 'cab-box';
                                box.innerHTML = `<span>№</span><div>${c.num}</div>`;
                                grid.appendChild(box);
                            }
                        });
                    }

                    // 2. Обновляем номер последнего кабинета (поле 'last')
                    const lastCabEl = document.getElementById('last-cab');
                    if(data.last !== undefined && lastCabEl.innerText != data.last) {
                        lastCabEl.innerText = data.last;
                        lastCabEl.style.animation = 'none';
                        lastCabEl.offsetHeight; // триггер reflow для перезапуска анимации
                        lastCabEl.style.animation = 'fadeIn 0.5s ease';
                    }
                })
                .catch(err => console.error("Ошибка API: ", err));
        }

        // Запуск обновления каждые 2 секунды
        setInterval(refresh, 2000);
        refresh();
    </script>
</body>
</html>
)rawliteral";