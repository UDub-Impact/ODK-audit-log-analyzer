import pandas as pd
import sys

def calculateAverage(df):

    # maps question field to list of all the response times
    questionTimes = {}
    row = 0

    for eventType in df["event"]:
        # only account for time on events labeled as "question"
        if eventType == "question":
            node = df["node"][row]
            if node not in questionTimes:
                questionTimes[node] = []
            time= df["end"][row] - df["start"][row]
            questionTimes[node].append(time)

        row += 1

    # calculate averages for each set of times
    for eachQuestion in questionTimes:
        times = questionTimes[eachQuestion]
        print("Form Question Field: " + eachQuestion[6:] + ", Average Input Time: " + str(sum(times) / len(times)))


if __name__== "__main__":
    file = sys.argv[1]
    df = pd.read_csv(file)
    calculateAverage(df);