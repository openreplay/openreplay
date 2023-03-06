def _add_to_dict(element, index, dictionary):
    if element not in dictionary.keys():
        dictionary[element] = [index]
    else:
        dictionary[element].append(index)