pip install cython
cd msgcodec
python3 setup-messages.py build_ext --inplace
python3 setup-msgcodec.py build_ext --inplace
python3 setup-messages.py install
python3 setup-msgcodec.py install
cd ..
rm -rf msgcodec
pip uninstall cython -y
