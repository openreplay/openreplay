from sklearn.svm import SVC

class SVM_recommendation():
    def __init__(**params):
        f"""{SVC.__doc__}"""
        self.svm = SVC(params)

    def fit(self, X1=None, X2=None):
        assert X1 is not None or X2 is not None, 'X1 or X2 must be given'
        self.svm.fit(X1)
        self.svm.fit(X2)


    def predict(self, X):
        return self.svm.predict(X)
