
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


def make_driver():
    port = 8123

    sys.path.append(os.path.dirname(os.path.realpath(__file__)))

    script_dir = os.path.dirname(os.path.realpath(__file__))

    # Start an HTTP server in the "unpacked" folder
    http_server_proc = Popen(["python", "-m", "SimpleHTTPServer", str(port)],
                                 cwd=script_dir + "/../../../../",
                                 preexec_fn=lambda: prctl.set_pdeathsig(signal.SIGKILL))

    # Start selenium
    selenium_env = os.environ.copy()
    selenium_env["PATH"] = script_dir + ":" + selenium_env["PATH"]
    print("Selenium env: ", selenium_env)
    selenium_proc = Popen(["java", "-jar", script_dir + "/binaries/selenium-server-standalone-2.53.1.jar"],
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

    return driver


# Singleton trick so we only make the driver once
driver = None

def get_driver():
    global driver

    if driver: return driver

    driver = make_driver()
    return driver

def close_driver():
    global driver
    if driver: driver.close()
