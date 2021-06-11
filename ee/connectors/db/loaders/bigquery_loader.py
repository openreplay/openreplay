import os
from pathlib import Path

from google.oauth2.service_account import Credentials

# obtain the JSON file:
# In the Cloud Console, go to the Create service account key page.
#
# Go to the Create Service Account Key page
# From the Service account list, select New service account.
# In the Service account name field, enter a name.
# From the Role list, select Project > Owner.
#
# Note: The Role field affects which resources your service account can access in your project. You can revoke these roles or grant additional roles later. In production environments, do not grant the Owner, Editor, or Viewer roles. For more information, see Granting, changing, and revoking access to resources.
# Click Create. A JSON file that contains your key downloads to your computer.
#
# Put it in utils under a name bigquery_service_account

base_path = Path(__file__).parent.parent.parent
creds_file = base_path / 'bigquery_utils' / 'bigquery_service_account.json'
credentials = Credentials.from_service_account_file(
    creds_file)


def insert_to_bigquery(df, table):
    df.to_gbq(destination_table=f"{os.environ['dataset']}.{table}",
              project_id=os.environ['project_id'],
              if_exists='append',
              credentials=credentials)


def transit_insert_to_bigquery(db, batch):
    ...

