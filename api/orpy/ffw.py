from collections.abc import Iterable
from uuid import uuid4


class FrontendException(Exception):
    pass


class HTMLElement:  # inspired from nevow
    """Python representaiton of html nodes.

    Text nodes are python strings.

    You must not instantiate this class directly, instead use the
    global instance of the class `HTMLElementSugar` called `h`.

    """

    __slots__ = ('_tag', '_children', '_properties')

    def __init__(self, tag):
        self._tag = tag
        self._children = list()
        self._properties = dict()

    def __call__(self, **properties):
        # HTMLElement is a callable to be able to implement the
        # intented interface such as h.div(**properties) see
        # HTMLElementSugar.  Replace existing properties, even if it
        # is not meant to be called more than once, and try to make
        # sure of that.
        assert not self._properties, "Invalid use of HTMLElement"
        self._properties = properties
        return self

    def __repr__(self):
        return '<HTMLElement: %s %s>' % (self._tag, self._properties)

    def extend(self, nodes):
        for node in nodes:
            self.append(node)

    def append(self, node):
        """Append a single node or string as a child"""
        # Sometime it is handy to instanciate an HTML node, and then
        # add children to it, prolly in a loop, so that the html code
        # can be read from top to bottom.
        #
        # Instead of the following:
        #
        #  items = [h.li()[f"Item number {index}" for index in range(10)]]
        #  container = h.ul(id="root")[items]
        #
        # In the above the children are instanciated before
        # use. Instead one can do the following:
        #
        #  container = h.ul(id="root")
        #  for index in range(10):
        #      container.append(h.li()[f"Item number {index}"])
        #
        # The code flows in way that is similar to how the html will
        # be rendered.
        #
        assert isinstance(node, (str, float, int, HTMLElement)), "Invalid node type"
        self._children.append(node)

    def __getitem__(self, something):
        """Add `something` as children of the node"""
        assert isinstance(something, (str, float, int, Iterable, HTMLElement))
        if isinstance(something, (str, float, int, HTMLElement)):
            self.append(something)
        elif isinstance(something, Iterable):
            for child in something:
                # HTMLElement.append will assert child is valid.
                self.append(child)
        else:
            # Oops!
            raise FrontendException("Unexpected child node: {}".format(something))
        # Returning self, allows method chaining, such as:
        #
        #  h.div(id="root")[h.h1()["hello"]]
        #
        # Withtout the following return the root div, would not have a
        # h1 as child.
        return self


class HTMLElementSugar:
    """Sugar syntax for building HTML with the help of `HTMLElement`.

    E.g.

    h.div(id="container", Class="minimal thing", For="something")["Héllo World!"]

    container = h.div(id="container", Class="minimal thing")
    container.append("Héllo World!")

    Properties are optional, subscripting to add children is also
    optional. So the general pattern is the following:

      h.tag(**properties)

    Or with children:

      h.tag(**properties)[children]

    In particular, `h.tag[something]` or even `h.tag` is invalid, such
    as `<br/>` must be instanciated with:

       h.br()

    Note: Autoclosing tags are handled browser side with javascript.

    """

    def __getattr__(self, tag):
        return HTMLElement(tag)


h = HTMLElementSugar()


def serialize(element):
    """Convert an `HTMLElement` hierarchy to a json string.

    Returns two values:

    - The composition of python dict, list, int, float, str
    - ie. json-like representation

    - An event dictionary mapping keys to callables

    """

    # Events maps unique identifiers to python callables, they are
    # gathered from the whole HTMLElement tree.
    events = dict()

    PROPERTIES = 1
    CHILDREN = 2

    def recurse(element):
        """Recursively convert `element` into json-like python structure"""
        if isinstance(element, (str, float, int)):
            return element
        elif isinstance(element, HTMLElement):
            out = [
                element._tag,
                dict(),
                None,
            ]

            for key, value in element._properties.items():
                if key.startswith('on'):
                    uid = uuid4().hex
                    # XXX: mutate non-local dictionary called `events`
                    assert callable(value)
                    events[uid] = value
                    out[PROPERTIES][key] = uid
                else:
                    if key == "Class":
                        out[PROPERTIES]["class"] = value
                    else:
                        out[PROPERTIES][key] = value
            out[CHILDREN] = [recurse(child) for child in element._children]
            return out
        else:
            raise FrontendException("Invalid element: {}".format(element))

    out = recurse(element)

    return out, events
