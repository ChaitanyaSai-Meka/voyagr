from fastapi import FastAPI
app = FastAPI()


@app.get("/calculate")
def test():
    return {"message":"working"}

