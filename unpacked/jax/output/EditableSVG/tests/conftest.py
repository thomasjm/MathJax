
from driver import close_driver
import pytest

# TODO: make the browser close at the end

@pytest.fixture(scope="session", autouse=True)
def my_own_session_run_at_beginning(request):
    print('In my_own_session_run_at_beginning()')

    def my_own_session_run_at_end():
        close_driver()
    request.addfinalizer(my_own_session_run_at_end)
