package main

// const FILES_SIZE_LIMIT int64 = 1e8		// 100Mb

// func startSessionHandlerIOS(w http.ResponseWriter, r *http.Request) {
// 	type request struct {
// 		// SessionID *string
// 		EncodedProjectID     *uint64 `json:"projectID"`
// 		TrackerVersion       string `json:"trackerVersion"`
// 		RevID                string `json:"revID"`
// 		UserUUID             *string `json:"userUUID"`
// 		//UserOS string `json"userOS"`  //hardcoded 'MacOS'
// 		UserOSVersion        string `json:"userOSVersion"`
// 		UserDevice           string `json:"userDevice"`
// 		Timestamp            uint64 `json:"timestamp"`
// 		// UserDeviceType uint  0:phone 1:pad 2:tv 3:carPlay 5:mac
// 		// “performances”:{
//   //     “activeProcessorCount”:8,
//   //     “isLowPowerModeEnabled”:0,
//   //     “orientation”:0,
//   //     “systemUptime”:585430,
//   //     “batteryState”:0,
//   //     “thermalState”:0,
//   //     “batteryLevel”:0,
//   //     “processorCount”:8,
//   //     “physicalMemory”:17179869184
//   //  },
// 	}
// 	type response struct {
// 		Token     		     string   `json:"token"`
// 		ImagesHashList     []string `json:"imagesHashList"`
// 		UserUUID           string   `json:"userUUID"`
// 		SESSION_ID         uint64   `json:"SESSION_ID"`		///TEMP
// 	}
// 	startTime := time.Now()
// 	req := &request{}
// 	body := http.MaxBytesReader(w, r.Body, JSON_SIZE_LIMIT)
// 	//defer body.Close()
// 	if err := json.NewDecoder(body).Decode(req); err != nil {
// 		responseWithError(w, http.StatusBadRequest, err)
// 		return
// 	}

// 	if req.EncodedProjectID == nil {
// 		responseWithError(w, http.StatusForbidden, errors.New("ProjectID value required"))
// 		return
// 	}
// 	projectID := decodeProjectID(*(req.EncodedProjectID))
// 	if projectID == 0 {
// 		responseWithError(w, http.StatusUnprocessableEntity, errors.New("ProjectID value is invalid"))
// 		return
// 	}
// 	p, err := pgconn.GetProject(uint32(projectID))
// 	if err != nil {
// 		if postgres.IsNoRowsErr(err) {
// 			responseWithError(w, http.StatusNotFound, errors.New("Project doesn't exist or is not active"))
// 		} else {
// 			responseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
// 		}
// 		return
// 	}
// 	sessionID, err := flaker.Compose(req.Timestamp)
// 	if err != nil {
// 		responseWithError(w, http.StatusInternalServerError, err)
// 		return
// 	}
// 	userUUID := getUUID(req.UserUUID)
// 	country := geoIP.ExtractISOCodeFromHTTPRequest(r)
// 	expirationTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)

// 	imagesHashList, err :=  s3.GetFrequentlyUsedKeys(*(req.EncodedProjectID)) // TODO: reuse index: ~ frequency * size
// 	if err != nil {
// 		responseWithError(w, http.StatusInternalServerError, err)
// 		return
// 	}

// 	responseWithJSON(w, &response{
// 		Token:     tokenizer.Compose(sessionID, uint64(expirationTime.UnixNano()/1e6)),
// 		ImagesHashList: imagesHashList,
// 		UserUUID: userUUID,
// 		//TEMP:
// 		SESSION_ID: sessionID,
// 	})
// 	producer.Produce(topicRaw, sessionID, messages.Encode(&messages.IOSSessionStart{
// 		Timestamp: req.Timestamp,
// 		ProjectID: projectID,
// 		TrackerVersion: req.TrackerVersion,
// 		RevID: req.RevID,
// 		UserUUID: userUUID,
// 		UserOS: "MacOS",
// 		UserOSVersion: req.UserOSVersion,
// 		UserDevice: MapIOSDevice(req.UserDevice),
// 		UserDeviceType: GetIOSDeviceType(req.UserDevice), //    string `json:"userDeviceType"` // From UserDevice; ENUM ?
// 		UserCountry: country,
// 	}))
// }


// func pushLateMessagesHandler(w http.ResponseWriter, r *http.Request) {
// 	sessionData, err := tokenizer.ParseFromHTTPRequest(r)
// 	if err != nil && err != token.EXPIRED {
// 		responseWithError(w, http.StatusUnauthorized, err)
// 		return
// 	}
// 	// Check timestamps here?
// 	pushMessages(w, r, sessionData.ID)
// }


// func iosImagesUploadHandler(w http.ResponseWriter, r *http.Request) {
// 	r.Body = http.MaxBytesReader(w, r.Body, FILES_SIZE_LIMIT)
// 	// defer r.Body.Close()
// 	err := r.ParseMultipartForm(1e5) // 100Kb
// 	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
// 		responseWithError(w, http.StatusUnsupportedMediaType, err)
// 	// } else if err == multipart.ErrMessageTooLarge // if non-files part exceeds 10 MB
// 	} else if err != nil {
// 		responseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
// 	}

// 	if len(r.MultipartForm.Value["projectID"]) == 0 {
// 		responseWithError(w, http.StatusBadRequest, errors.New("projectID parameter required")) // status for missing/wrong parameter?
// 		return
// 	}
// 	// encodedProjectID, err := strconv.ParseUint(r.MultipartForm.Value["projectID"][0], 10, 64)
// 	// projectID := decodeProjectID(encodedProjectID)
// 	// if projectID == 0 || err != nil {
// 	// 	responseWithError(w, http.StatusUnprocessableEntity, errors.New("projectID value is incorrect"))
// 	// 	return
// 	// }
// 	prefix := r.MultipartForm.Value["projectID"][0] + "/" //strconv.FormatUint(uint64(projectID), 10) + "/"

// 	for _, fileHeaderList := range r.MultipartForm.File {
// 		for _, fileHeader := range fileHeaderList {
// 			file, err := fileHeader.Open()
// 			if err != nil {
// 				continue // TODO: send server error or accumulate successful files
// 			}
// 			key := prefix + fileHeader.Filename // TODO: Malicious image put: use jwt?
// 			go s3.Upload(file, key, "image/png", false)
// 		}
// 	}

// 	w.WriteHeader(http.StatusOK)
// }
