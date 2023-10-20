sleep 120
echo "Creating indexes.."
quickwit index create --index-config index-config-fetch.yaml
quickwit index create --index-config index-config-graphql.yaml
quickwit index create --index-config index-config-pageevent.yaml
echo "Running kafka reader.."
python3 -u consumer.py

