# --- helper functions for logs ---
info() {
	echo '[INFO] ' "$@"
}
warn() {
	echo '[WARN] ' "$@" >&2
}
fatal() {
	echo '[ERROR] ' "$@" >&2
	exit 1
}

export PATH=/var/lib/openreplay:$PATH

read -p "enter openreplay domain name: " domain
nslookup $domain >/dev/null || {
	fatal "Domain name does not have ip associated with it. Please check your DNS record."
}

# Reading email address for ssl certificate
[[ -z $EMAIL_ADDRESS ]] && {
	read -p "Enter your email address for letsencrypt certificate: " EMAIL_ADDRESS
	echo
}
if [[ "$EMAIL_ADDRESS" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$ ]]; then
	info "Email address $EMAIL_ADDRESS is valid."
else
	fatal "Email address $EMAIL_ADDRESS is invalid."
fi

sudo sed -i "s/email: .*/email: \"${EMAIL_ADDRESS}\"/g" clusterIssuer.yaml
info "Installing cert-manager for auto letsencrypt certificate"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.crds.yaml
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm upgrade --install cert-manager --namespace cert-manager --version v1.8.0 jetstack/cert-manager --create-namespace
kubectl apply -f clusterIssuer.yaml
