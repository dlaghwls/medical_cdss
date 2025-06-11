FROM python:3.11

WORKDIR /app

# 1. 의존성 파일 먼저 복사 (캐시 효율을 위해)
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 2. 나머지 모든 소스 코드 복사 (가장 중요한 부분)
COPY . .

# 3. shared_data 복사는 이제 COPY . . 에 포함되므로 주석처리하거나 삭제해도 됩니다.
# COPY ./shared_data/feature_columns.json /shared_data/feature_columns.json

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]