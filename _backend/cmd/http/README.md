# HTTP Endpoints

## Start Mobile Session
`POST` /v1/ios/start
### Request
`application/json`

```
* - required
{
	projectID*  			number  // Encoded ProjectID
	trackerVersion*   string  // Tracker version string
	revID             string  // Set by user
	userUUID          string  // User ID, should be derived from local storage connected to user
	userOSVersion     string 
	userDevice        string
	userDeviceType    number  //
	performance       // 
}
```

### Response 

```
200 application/json
{
	imagesHashList  // list of most friquently used image hash strings
	token           // Authorisation token to use in other requests (Bearer)
	userUUID        // Should be stored in local storage
}
```


## Push message batch
`POST` /v1/ios/append
### Request
`application/octet-stream`
```
<binary encoded messages>
```
### Response
200 OK

OR

401 Unauthorised - token timed out. Start new session


## Push late message batch (after app reload - crashes etc.)
`POST` /v1/ios/late
### Request
`application/octet-stream`
```
<binary encoded messages>
```
### Response
200 OK



## Push images
`POST` /v1/ios/images

### Request
`multipart/form-data` values:
`projectID`  [required] // Encoded ProjectID

Binary files with the hash-filename in the `filename` header each.


### Response
200 OK
