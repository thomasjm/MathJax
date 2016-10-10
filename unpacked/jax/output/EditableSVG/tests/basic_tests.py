
from base_test import EditableSVGTest

class BasicTests(EditableSVGTest):

    def test_basic(self):
        self.send_keystrokes("x+y", "x+y")
        self.backspace()
        self.send_keystrokes("asdf", "asdf")
        self.backspace()
        self.send_keystrokes("x^2", "x^2")

    def test_exponent(self):
        self.send_keystrokes("x^2x", "x^{2x}")

    def test_integral(self):
        self.send_keystrokes("\int ^x  _y", "{\\int}^x_y")
