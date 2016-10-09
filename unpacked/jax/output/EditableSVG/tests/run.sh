#!/bin/bash

virtualenv mathjax_test
source mathjax_test/bin/activate
pip install -r requirements.txt
py.test selenium_tests.py
