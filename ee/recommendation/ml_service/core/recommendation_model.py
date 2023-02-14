import mlflow.pyfunc

from sklearn.svm import SVC
from sklearn.feature_selection import SequentialFeatureSelector as sfs
from sklearn.preprocessing import normalize
from sklearn.decomposition import PCA
from sklearn.neighbors import KNeighborsClassifier as knc


def select_features(X, y):
    knn = knc(n_neighbors=3)
    selector = sfs(knn, n_features_to_select=3)
    selector.fit(X, y)

    def transform(input):
        return selector.transform(input)
    return transform


def sort_database(X, y):
    import random
    sort_list = list(range(len(y)))
    random.shuffle(sort_list)
    return X[sort_list], y[sort_list]


def preprocess(X):
    _, n = X.shape
    pca = PCA(n_components=n)
    x = pca.fit_transform(normalize(X))

    def transform(input):
        return pca.transform(normalize(input))

    return x, transform


class SVM_recommendation(mlflow.pyfunc.PythonModel):

    def __init__(self, test=False, **params):
        f"""{SVC.__doc__}"""
        if 'probability' not in params.keys():
            params['probability'] = True
        assert params['probability'], 'Models need probability parameter set to True'

        self.svm = SVC(**params)
        self.transforms = [lambda k: k]
        self.score = 0
        if test:
            knn = knc(n_neighbors=3)
            self.transform = [PCA(n_components=3), sfs(knn, n_features_to_select=2)]

    def fit(self, X, y):
        assert X.shape[0] == y.shape[0], 'X and y must have same length'
        assert len(X.shape) == 2, 'X must be a two dimension vector'
        X, t1 = preprocess(X)
        t2 = select_features(X, y)
        X = t2(X)
        self.transforms = [t1, t2]
        self.svm.fit(X, y)
        self.score = self.svm.score(X, y)

    def predict(self, x):
        for t in self.transforms:
            x = t(x)
        return self.svm.predict(x)

    def recommendation_order(self, x):
        for t in self.transforms:
            x = t(x)
        pred = self.svm.predict_proba(x)
        return sorted(range(len(pred)), key=lambda k: pred[k][1], reverse=True), pred
