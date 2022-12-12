import mlflow
##
import numpy as np
import pickle

from sklearn import datasets, linear_model
from sklearn.metrics import mean_squared_error, r2_score

# source: https://scikit-learn.org/stable/auto_examples/linear_model/plot_ols.html

# Load the diabetes dataset
diabetes_X, diabetes_y = datasets.load_diabetes(return_X_y=True)

# Use only one feature
diabetes_X = diabetes_X[:, np.newaxis, 2]

# Split the data into training/testing sets
diabetes_X_train = diabetes_X[:-20]
diabetes_X_test = diabetes_X[-20:]

# Split the targets into training/testing sets
diabetes_y_train = diabetes_y[:-20]
diabetes_y_test = diabetes_y[-20:]


def print_predictions(m, y_pred):

    # The coefficients
    print('Coefficients: \n', m.coef_)
    # The mean squared error
    print('Mean squared error: %.2f'
          % mean_squared_error(diabetes_y_test, y_pred))
    # The coefficient of determination: 1 is perfect prediction
    print('Coefficient of determination: %.2f'
          % r2_score(diabetes_y_test, y_pred))

# Create linear regression object
lr_model = linear_model.LinearRegression()

# Train the model using the training sets
lr_model.fit(diabetes_X_train, diabetes_y_train)

# Make predictions using the testing set
diabetes_y_pred = lr_model.predict(diabetes_X_test)
print_predictions(lr_model, diabetes_y_pred)

# save the model in the native sklearn format
filename = 'lr_model.pkl'
pickle.dump(lr_model, open(filename, 'wb'))
##
# load the model into memory
loaded_model = pickle.load(open(filename, 'rb'))

# log and register the model using MLflow scikit-learn API
mlflow.set_tracking_uri("postgresql+psycopg2://airflow:airflow@postgres/mlruns")
reg_model_name = "SklearnLinearRegression"
print("--")
mlflow.sklearn.log_model(loaded_model, "sk_learn",
                             serialization_format="cloudpickle",
                             registered_model_name=reg_model_name)
