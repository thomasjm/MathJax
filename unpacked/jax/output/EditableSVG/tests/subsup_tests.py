
from base_test import EditableSVGTest

class SubSupTests(EditableSVGTest):

    def test_subscript_after_command_without_space(self):
        self.send_keystrokes("\int_0", "{\\smallint}_0")

    def test_superscript_after_command_without_space(self):
        self.send_keystrokes("\int^1 ", "{\\smallint}^1")
