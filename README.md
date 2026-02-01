# Remote-test

Repositorio de demostración para trabajar **100% remoto** sin necesidad de una PC local.

## ¿Cómo funciona?

Este proyecto demuestra que puedes:
1. Escribir código
2. Ejecutar pruebas
3. Ver resultados de cobertura
4. Hacer commits y push

**Todo desde el entorno cloud de Cursor, sin necesidad de una máquina local.**

## Estructura del Proyecto

```
/workspace/
├── src/
│   └── calculator.py    # Módulo de calculadora simple
├── tests/
│   └── test_calculator.py  # Tests con pytest
├── requirements.txt     # Dependencias
└── README.md
```

## Ejecutar Pruebas

### Instalar dependencias
```bash
pip install -r requirements.txt
```

### Ejecutar tests
```bash
python3 -m pytest tests/ -v
```

### Ejecutar tests con cobertura
```bash
python3 -m pytest tests/ -v --cov=src --cov-report=term-missing
```

## Resultados de las Pruebas

Al ejecutar las pruebas en el entorno remoto, obtenemos:

```
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.2

tests/test_calculator.py::TestAdd::test_add_positive_numbers PASSED
tests/test_calculator.py::TestAdd::test_add_negative_numbers PASSED
tests/test_calculator.py::TestAdd::test_add_mixed_numbers PASSED
tests/test_calculator.py::TestAdd::test_add_floats PASSED
tests/test_calculator.py::TestSubtract::test_subtract_positive_numbers PASSED
tests/test_calculator.py::TestSubtract::test_subtract_negative_result PASSED
tests/test_calculator.py::TestMultiply::test_multiply_positive_numbers PASSED
tests/test_calculator.py::TestMultiply::test_multiply_by_zero PASSED
tests/test_calculator.py::TestMultiply::test_multiply_negative_numbers PASSED
tests/test_calculator.py::TestDivide::test_divide_positive_numbers PASSED
tests/test_calculator.py::TestDivide::test_divide_floats PASSED
tests/test_calculator.py::TestDivide::test_divide_by_zero_raises_error PASSED

============================== 12 passed ======================================
Coverage: 100%
```

## Ventajas del Desarrollo 100% Remoto

- **Sin configuración local**: No necesitas instalar Python, pip, ni dependencias en tu máquina
- **Entorno consistente**: El mismo entorno para todos los desarrolladores
- **Acceso desde cualquier lugar**: Solo necesitas un navegador
- **Recursos de cloud**: Aprovecha la potencia del servidor remoto
