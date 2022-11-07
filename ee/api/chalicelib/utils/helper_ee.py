import random
import string


def generate_salt():
    return "".join(random.choices(string.hexdigits, k=36))
