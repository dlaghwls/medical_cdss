FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# COPY ../frontend/src/data/feature_columns.json /frontend/src/data/feature_columns.json
COPY ./shared_data/feature_columns.json /shared_data/feature_columns.json
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]