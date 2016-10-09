#!/usr/bin/python

from driver import get_driver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from unittest2 import TestCase

class EditableSVGTest(TestCase):

    def setUp(self):
        self.driver = get_driver()

        # Clear the state of the element
        self.driver.execute_script("MathJax.OutputJax.EditableSVG.clear($('.MathJax_SVG')[0]);")

        # Focus the EditableSVG
        svg = self.driver.find_element(By.XPATH, '//*[@id="MathJax-Element-1-Frame"]/*[name()="svg"]/*[name()="g"]/*[name()="g"]')
        svg.click()

    def get_tex(self):
        texbox = self.driver.find_element_by_css_selector("textarea#tex")
        tex = texbox.get_attribute('value')

        # Remove all whitespace
        return "".join(tex.split())

    def send_keystrokes(self, keys, expected):
        elem = self.driver.switch_to.active_element
        elem.send_keys(keys)
        assert self.get_tex() == expected

    def backspace(self):
        elem = self.driver.switch_to.active_element
        elem.send_keys([Keys.BACK_SPACE] * 50)
