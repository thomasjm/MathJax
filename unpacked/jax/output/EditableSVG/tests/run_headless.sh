#!/bin/bash

virtualenv mathjax_test
source mathjax_test/bin/activate
pip install -r requirements.txt
xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" py.test
