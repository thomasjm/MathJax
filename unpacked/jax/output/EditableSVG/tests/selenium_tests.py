#!/usr/bin/python

import os
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from subprocess import Popen
import sys
from time import sleep
from unittest2 import TestCase

# Install these packages:
# pip install unittest2
# pip install pytest
# pip install selenium
# Then do "py.test [file]"


class TestEditableSVG(TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.append(os.path.dirname(os.path.realpath(__file__)))
        print("ZZZZZZZ PATH: ", sys.path)

    def setUp(self):
        self.port = 8123

        script_dir = os.path.dirname(os.path.realpath(__file__))

        self.http_server_proc = Popen(["python", "-m", "SimpleHTTPServer", str(self.port)],
                                      cwd=script_dir + "/..")

        # Start selenium
        selenium_env = os.environ.copy()
        selenium_env["PATH"] = script_dir + ":" + selenium_env["PATH"]
        print("Selenium env: ", selenium_env)
        self.selenium_proc = Popen(["java", "-jar", script_dir + "/selenium-server-standalone-2.53.1.jar"],
                                   env=selenium_env)

        self.driver = webdriver.Chrome()

        # Navigate to page
        self.driver.get("http://localhost:%d/jax/output/EditableSVG/empty.htm" % self.port)

        # Wait for MathJax to render
        self.driver.execute_script("MathJax.Hub.Queue(function() { document.mathjax_loaded = true; })")
        while True:
            if self.driver.execute_script('return document.mathjax_loaded'):
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
