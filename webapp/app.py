"""
Aplicación web de demostración para entorno 100% remoto.
Accesible desde cualquier dispositivo (incluyendo iPad) via túnel.
"""
from flask import Flask, render_template_string, jsonify
import datetime
import os

app = Flask(__name__)

# Template HTML moderno y responsive
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Entorno Remoto - Cursor Cloud</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        h1 {
            color: #1a202c;
            font-size: 2rem;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .subtitle {
            color: #718096;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .status-card {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .status-card h2 {
            font-size: 1.5rem;
            margin-bottom: 5px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .info-item {
            background: #f7fafc;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .info-item label {
            color: #718096;
            font-size: 0.875rem;
            display: block;
            margin-bottom: 5px;
        }
        
        .info-item span {
            color: #1a202c;
            font-weight: 600;
        }
        
        .calculator-section {
            background: #edf2f7;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        
        .calculator-section h3 {
            color: #2d3748;
            margin-bottom: 15px;
        }
        
        .calc-form {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        input[type="number"] {
            padding: 10px 15px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            width: 80px;
        }
        
        select, button {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
        }
        
        select {
            border: 2px solid #e2e8f0;
            background: white;
        }
        
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-weight: 600;
            transition: transform 0.2s;
        }
        
        button:hover {
            transform: scale(1.05);
        }
        
        #result {
            margin-top: 15px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            font-size: 1.25rem;
            font-weight: 600;
            color: #2d3748;
            text-align: center;
            display: none;
        }
        
        .footer {
            text-align: center;
            color: #a0aec0;
            font-size: 0.875rem;
        }
        
        .emoji {
            font-size: 3rem;
            text-align: center;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">☁️</div>
        <h1>Entorno 100% Remoto</h1>
        <p class="subtitle">Ejecutando en Cursor Cloud Agents</p>
        
        <div class="status-card">
            <h2>✅ Servidor Activo</h2>
            <p>Accesible desde tu iPad sin localhost</p>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <label>Hora del servidor</label>
                <span>{{ server_time }}</span>
            </div>
            <div class="info-item">
                <label>Plataforma</label>
                <span>{{ platform }}</span>
            </div>
            <div class="info-item">
                <label>Python</label>
                <span>{{ python_version }}</span>
            </div>
            <div class="info-item">
                <label>Framework</label>
                <span>Flask</span>
            </div>
        </div>
        
        <div class="calculator-section">
            <h3>🧮 Calculadora Interactiva</h3>
            <p style="color: #718096; margin-bottom: 15px;">Prueba que el backend funciona</p>
            <div class="calc-form">
                <input type="number" id="num1" value="10" placeholder="Número 1">
                <select id="operation">
                    <option value="add">+</option>
                    <option value="subtract">-</option>
                    <option value="multiply">×</option>
                    <option value="divide">÷</option>
                </select>
                <input type="number" id="num2" value="5" placeholder="Número 2">
                <button onclick="calculate()">Calcular</button>
            </div>
            <div id="result"></div>
        </div>
        
        <p class="footer">
            Desarrollado en la nube • Sin necesidad de PC local
        </p>
    </div>
    
    <script>
        async function calculate() {
            const num1 = document.getElementById('num1').value;
            const num2 = document.getElementById('num2').value;
            const operation = document.getElementById('operation').value;
            
            try {
                const response = await fetch(`/api/calculate?a=${num1}&b=${num2}&op=${operation}`);
                const data = await response.json();
                
                const resultDiv = document.getElementById('result');
                resultDiv.style.display = 'block';
                
                if (data.error) {
                    resultDiv.innerHTML = '❌ ' + data.error;
                    resultDiv.style.color = '#e53e3e';
                } else {
                    resultDiv.innerHTML = `✨ Resultado: ${data.result}`;
                    resultDiv.style.color = '#38a169';
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    </script>
</body>
</html>
"""

@app.route('/')
def home():
    """Página principal."""
    import platform
    import sys
    
    return render_template_string(
        HTML_TEMPLATE,
        server_time=datetime.datetime.now().strftime('%H:%M:%S'),
        platform=platform.system(),
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}"
    )


@app.route('/api/calculate')
def calculate():
    """API de calculadora."""
    from flask import request
    
    try:
        a = float(request.args.get('a', 0))
        b = float(request.args.get('b', 0))
        op = request.args.get('op', 'add')
        
        operations = {
            'add': lambda x, y: x + y,
            'subtract': lambda x, y: x - y,
            'multiply': lambda x, y: x * y,
            'divide': lambda x, y: x / y if y != 0 else None
        }
        
        if op not in operations:
            return jsonify({'error': 'Operación no válida'})
        
        result = operations[op](a, b)
        
        if result is None:
            return jsonify({'error': 'No se puede dividir por cero'})
        
        return jsonify({'result': result})
    except ValueError:
        return jsonify({'error': 'Valores numéricos inválidos'})


@app.route('/api/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.now().isoformat()
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
