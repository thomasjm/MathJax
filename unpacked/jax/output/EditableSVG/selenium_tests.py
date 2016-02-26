#!/usr/bin/python

import os
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from subprocess import Popen
from time import sleep
from unittest2 import TestCase

# Install these packages:
# pip install unittest2
# pip install pytest
# pip install selenium
# Then do "py.test [file]"

class TestEditableSVG(TestCase):
    def setUp(self):
        unpacked_dir = os.path.dirname(os.path.realpath(__file__)) + "/../../.."

        self.port = 8000
        self.http_server_proc = Popen(["python", "-m", "SimpleHTTPServer", str(self.port)],
                                      cwd=unpacked_dir)

        # Start selenium
        self.selenium_proc = Popen(["java", "-jar", unpacked_dir + "../test/selenium-server-standalone-2.52.0.jar"])

        self.driver = webdriver.Chrome()

        # Navigate to page
        self.driver.get("http://localhost:%d/jax/output/EditableSVG/empty.htm" % self.port)

        # Wait for MathJax to render
        self.driver.execute_script("MathJax.Hub.Queue(function() { document.mathjax_loaded = true; })")
        while True:
            if self.driver.execute_script('return document.mathjax_loaded') == True:
                break

        # Focus the EditableSVG
        svg = self.driver.find_element(By.XPATH, '//*[@id="MathJax-Element-1-Frame"]/*[name()="svg"]/*[name()="g"]/*[name()="g"]')
        svg.click()

        # Delete the single "x" we start with
        ActionChains(self.driver).key_down(Keys.SHIFT).send_keys(Keys.ARROW_RIGHT).send_keys(Keys.BACKSPACE).key_up(Keys.SHIFT).perform()

    def tearDown(self):
        self.driver.close()
        self.selenium_proc.kill()
        self.http_server_proc.kill()

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

    def test_basic(self):
        self.send_keystrokes("x+y", "x+y")
        self.backspace()
        self.send_keystrokes("asdf", "asdf")
        self.backspace()
        self.send_keystrokes("x^2", "x^2")
        self.backspace()

    def test_exponent(self):
        self.send_keystrokes("x^2x", "x^{2x}")

    def test_integral(self):
        self.send_keystrokes("\int ^x  _y", "{\\smallint}^x_y")
