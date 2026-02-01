"""
Tests para el módulo calculator.
Demostración de ejecución de pruebas en entorno 100% remoto.
"""
import pytest
import sys
import os

# Agregar el directorio src al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from calculator import add, subtract, multiply, divide


class TestAdd:
    """Tests para la función add."""
    
    def test_add_positive_numbers(self):
        assert add(2, 3) == 5
    
    def test_add_negative_numbers(self):
        assert add(-2, -3) == -5
    
    def test_add_mixed_numbers(self):
        assert add(-2, 3) == 1
    
    def test_add_floats(self):
        assert add(1.5, 2.5) == 4.0


class TestSubtract:
    """Tests para la función subtract."""
    
    def test_subtract_positive_numbers(self):
        assert subtract(5, 3) == 2
    
    def test_subtract_negative_result(self):
        assert subtract(3, 5) == -2


class TestMultiply:
    """Tests para la función multiply."""
    
    def test_multiply_positive_numbers(self):
        assert multiply(3, 4) == 12
    
    def test_multiply_by_zero(self):
        assert multiply(5, 0) == 0
    
    def test_multiply_negative_numbers(self):
        assert multiply(-3, -4) == 12


class TestDivide:
    """Tests para la función divide."""
    
    def test_divide_positive_numbers(self):
        assert divide(10, 2) == 5
    
    def test_divide_floats(self):
        assert divide(7, 2) == 3.5
    
    def test_divide_by_zero_raises_error(self):
        with pytest.raises(ValueError, match="No se puede dividir por cero"):
            divide(10, 0)
