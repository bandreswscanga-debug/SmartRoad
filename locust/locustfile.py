from locust import HttpUser, task, between

class SmartRoadUser(HttpUser):
    wait_time = between(1, 2)
    host = "http://nginx"

    @task(5)
    def health(self):
        self.client.get("/api/health")

    @task(2)
    def api_docs(self):
        self.client.get("/api/docs")

    @task(1)
    def root_check(self):
        self.client.get("/")
