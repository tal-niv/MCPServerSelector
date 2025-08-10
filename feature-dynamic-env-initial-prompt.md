Currently the list of environments is hard-coded: prod, dev and local.
I want the list to be dynamic. it should be read from a file mcp-environments.props located in mcp-selector folder 

the file will be an ordered properies file with the the structure:
Local:mcp-local.json
Dev:mcp-dev.json
Prod:mcp-prod.json

First (upper) env is considered the more local, where lowest is the highest risk / prod env. Please color accordingly, moving from the safe green, ending with high risk red. any mid level env should be displayed in orange.

content of the file is case sensitive, where the key is shown in the status bar, and value is the name of the mcp configuration file matching this environment.