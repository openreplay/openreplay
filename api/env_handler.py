from os import environ
import json

with open('.chalice/config.json') as json_file:
    data = json.load(json_file)
    stages = data.get("stages", {})
    for s in stages.keys():
        if environ.get("SITE_URL") is None or environ["SITE_URL"] == '':
            environ["SITE_URL"] = environ.get("S3_HOST", "")
        data["stages"][s]["environment_variables"] = {**stages[s].get("environment_variables", {}), **environ}
with open('.chalice/config.json', 'w') as outfile:
    json.dump(data, outfile, indent=2, sort_keys=True)
    print("override config.json")
