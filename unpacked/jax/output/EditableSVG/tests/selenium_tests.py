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
import signal
import prctl

# Install the packages in requirements.txt
# Then do "py.test [file]"

# Maybe organize the driver like this:
# https://gist.github.com/adamgoucher/3921739

driver = None

class TestEditableSVG(TestCase):
    @classmethod
    def setUpClass(cls):
        port = 8123

        sys.path.append(os.path.dirname(os.path.realpath(__file__)))

        script_dir = os.path.dirname(os.path.realpath(__file__))

        # Start an HTTP server in the "unpacked" folder
        cls.http_server_proc = Popen(["python", "-m", "SimpleHTTPServer", str(port)],
                                     cwd=script_dir + "/../../../../",
                                     preexec_fn=lambda: prctl.set_pdeathsig(signal.SIGKILL))

        # Start selenium
        selenium_env = os.environ.copy()
        selenium_env["PATH"] = script_dir + ":" + selenium_env["PATH"]
        print("Selenium env: ", selenium_env)
        cls.selenium_proc = Popen(["java", "-jar", script_dir + "/binaries/selenium-server-standalone-2.53.1.jar"],
                                  env=selenium_env,
                                  preexec_fn=lambda: prctl.set_pdeathsig(signal.SIGKILL))

        global driver
        driver = webdriver.Chrome(executable_path=script_dir + "/binaries/chromedriver")

        # Navigate to page
        driver.get("http://localhost:%d/jax/output/EditableSVG/empty.htm" % port)

        # Wait for MathJax to render
        driver.execute_script("MathJax.Hub.Queue(function() { document.mathjax_loaded = true; })")
        while True:
            if driver.execute_script('return document.mathjax_loaded'):
                break

        # Focus the EditableSVG
        svg = driver.find_element(By.XPATH, '//*[@id="MathJax-Element-1-Frame"]/*[name()="svg"]/*[name()="g"]/*[name()="g"]')
        svg.click()

        # Delete the single "x" we start with
        ActionChains(driver).key_down(Keys.SHIFT).send_keys(Keys.ARROW_RIGHT).send_keys(Keys.BACKSPACE).key_up(Keys.SHIFT).perform()

    def setUp(self):
        global driver
        self.driver = driver

        # Clear the state of the element
        print("About to clear!")
        self.driver.execute_script("MathJax.OutputJax.EditableSVG.clear($('.MathJax_SVG')[0]);")
        print("Just cleared")
        # Focus the EditableSVG
        svg = driver.find_element(By.XPATH, '//*[@id="MathJax-Element-1-Frame"]/*[name()="svg"]/*[name()="g"]/*[name()="g"]')
        svg.click()

        # sleep(5)

    @classmethod
    def tearDownClass(cls):
        global driver
        driver.close()

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

    def test_exponent(self):
        self.send_keystrokes("x^2x", "x^{2x}")

    def test_integral(self):
        self.send_keystrokes("\int ^x  _y", "{\\smallint}^x_y")

    def test_subscript_after_command_without_space(self):
        self.send_keystrokes("\int_0", "{\\smallint}_0")

    def test_superscript_after_command_without_space(self):
        self.send_keystrokes("\int^1 ", "{\\smallint}^1")
