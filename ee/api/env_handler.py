from os import environ
import json

with open('.chalice/config.json') as json_file:
    data = json.load(json_file)
    stages = data.get("stages", {})
    for s in stages.keys():
        target = f'chalicelib/.configs/{stages[s].get("environment_variables", {}).get("stage", s)}.json'
        data = {}
        try:
            with open(target) as stage_vars:
                data = json.load(stage_vars)
        except IOError:
            pass
        with open(target, 'w') as outfile:
            json.dump({**data, **environ}, outfile, indent=2, sort_keys=True)
            print(f"injected env-vars to {target}")
