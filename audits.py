import pandas as pd
import sys

userData = {}
s = {}

def parseData(df):

    # maps question field to list of all the response times
    row = 0
    for eventType in df["event"]:
        # only account for time on events labeled as "question"
        if eventType == "question":
            id = df["instanceID"][row]
            node = df["node"][row]
            if id not in userData:
                userData[id] = {}
            time= df["end"][row] - df["start"][row]

            if (node in userData[id]):
                userData[id][node][0] += time
                userData[id][node][1] += 1
            else:
                userData[id][node] = [time,1]
        row += 1


def calculateAverage():
    # calculate averages for each set of times
    for id in userData:
        for question in userData[id]:
            if question not in s:
                s[question] = userData[id][question][0]
            else:
                s[question] += userData[id][question][0]

    # output averages
    print("--AVERAGES--")
    for id in s:
        s[id] /= len(userData)
        print("  Form Question Field: " + id[6:] + ", Average Input Time: " + str(s[id]))
    print()


def compareToAverage():
    print("--OUTLIERS--")
    for id in userData:
        for question in userData[id]:
            # threshold for time difference from average
            if abs(userData[id][question][0]-s[question]) > 4000.00:
                print(" Submission " + str(id)+ " took longer than the average on field " + question[6:])
    print()


def numberOfChangedAnswers():
    print("--FREQUENT RESPONSE CHANGES--")
    for id in userData:
        for question in userData[id]:
            changes = userData[id][question][1]
            # threshold for how many changed answers is relevant
            if changes >= 2:
                print(" Submission " + str(id)+ " changed their answer " + str(changes) + " times on field "+ question[6:])
    print()

if __name__== "__main__":
    file = sys.argv[1]
    df = pd.read_csv(file)
    print()
    print("AUDIT RESULTS:")
    parseData(df);
    calculateAverage();
    compareToAverage();
    numberOfChangedAnswers();