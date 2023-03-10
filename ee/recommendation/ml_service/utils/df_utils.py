from utils.declarations import CountryValue, DeviceValue


def _add_to_dict(element, index, dictionary):
    if element not in dictionary.keys():
        dictionary[element] = [index]
    else:
        dictionary[element].append(index)


def _process_pg_response(res, _X, _Y, X_project_ids, X_users_ids, X_sessions_ids, label=None):
    for i in range(len(res)):
        x = res[i]
        _add_to_dict(x.pop('project_id'), i, X_project_ids)
        _add_to_dict(x.pop('session_id'), i, X_sessions_ids)
        _add_to_dict(x.pop('user_id'), i, X_users_ids)
        if label is None:
            _Y.append(int(x.pop('train_label')))
        else:
            _Y.append(label)

        x['country'] = CountryValue(x['country']).get_int_val()
        x['device_type'] = DeviceValue(x['device_type']).get_int_val()
        _X.append(list(x.values()))
