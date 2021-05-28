// groupedAuditData stored in the format specified by groupAuditData()
// Set by calling getAndProcessAuditData() which then allows visualisations to be displayed with show...() functions
var groupedAuditData;

// list of all tags used in show...() functions
const chartTags = ["average-question-time", "average-question-changes", "submission-times"];

// dictionary mapping chart tags to the chart names that should be used
const chartNames = {
	"average-question-time": "Average Time Spent Responding Per Question",
	"average-question-changes": "Average Number of Response Changes Per Question",
	"submission-times": "Time Spent Responding Per Submission",
}

// dictionary mapping chart tags to their descriptions
const chartDescriptions = {
	"average-question-time":
		"This bar chart shows the average time spent responding to each question across submissions." +
		"This is the total time that the question has been selected across all submissions divided by the number of submissions that selected the question.",
	"average-question-changes":
		"This bar chart shows the average number of times the response to each question is changed." +
		"This is the total number of times the response to this question was changed divided by the number of submissions that selected the question." + 
		"When calculating the number of changes, the first entry to a question isn't counted, only subsequent changes.",
	"submission-times":
		"This bar chart shows the total amount of time spent answering questions per submission." +
		"This metric only includes time spent on a submission while selecting a question."
}

// Creates input element that allows user to select audit file and processes selected file
// Sets groupedAuditData variable
// Clears the contents of all tags in chartTags so that old visualizations won't stick around when we change the dataset
function getAndProcessAuditData() {
  	let input = document.createElement('input');
  	input.type = 'file';

	input.onchange = e => { 
    	// get the file reference
    	let file = e.target.files[0]; 

    	// set up FileReader
    	let reader = new FileReader();
    	reader.readAsText(file,'UTF-8');

    	// read file and output content
    	reader.onload = readerEvent => {
    		auditStr = readerEvent.target.result;

			// auditData is a list of dictionaries s.t. each dictionary represents a row of the original audit CSV data
			let auditData = d3.csvParse(auditStr);

			// rows of the original CSV audit have events from many different submissions jumbled together
			// this function groups all events by submission
			// this gives us a dictionary that maps submission id to events for that submission
			groupedAuditData = groupAuditData(auditData);

			// clear current visualizations
			for (const tag of chartTags) {
				const node = document.getElementById(tag);
				node.innerHTML = '';
			}
    	}
    }

	input.click();
}

// Displays average question times in a bar chart in the element with id "average-question-time"
// Should only be called after getAndProcessAuditData()
function showAverageQuestionTimes() {
	// the first function here keeps the data in a similar format to groupedData but maps question names to
	// the time spent responding to that question (rather than a list of events)
	let groupedSubmissionTimes = reduceSubmissionQuestions(groupedAuditData, calculateQuestionTime);
	// this function takes submission ids out of the picture and calculates the average time spent responding to
	// each question across submissions
	let averageQuestionTimes = calculateAverageQuestionValues(groupedSubmissionTimes);

	const tag = "average-question-time";

	let vegaSpec = {
		title: chartNames[tag],
		width: "container",
		data: {
			values: averageQuestionTimes,
		},
		mark: "bar",
		encoding: {
			x: {
				title: "Question", field: "node", type: "nominal",
				axis: {
					labelAngle: 0,
				},
			},
			y: {title: "Average Response Time (seconds)", field: "value", type: "quantitative"},
		},
	};

	vegaEmbed("#" + tag, vegaSpec);
}

// Displays average question changes in a bar chart in the element with id "average-question-changes"
// Should only be called after getAndProcessAuditData()
function showAverageQuestionChanges() {
	let groupedSubmissionQuestionChanges = reduceSubmissionQuestions(groupedAuditData, calculateQuestionChanges);
	let averageQuestionChanges = calculateAverageQuestionValues(groupedSubmissionQuestionChanges);

	const tag = "average-question-changes";

	let vegaSpec = {
		title: chartNames[tag],
		width: "container",
		data: {
			values: averageQuestionChanges,
		},
		mark: "bar",
		encoding: {
			x: {
				title: "Question", field: "node", type: "nominal",
				axis: {
					labelAngle: 0,
				},
			},
			y: {title: "Average Response Changes", field: "value", type: "quantitative"},
		},
	};

	vegaEmbed("#" + tag, vegaSpec);
}

// Displays time spent on each submission in a bar chart in the element with id "submission-times"
// Should only be called after getAndProcessAuditData()
function showSubmissionTimes() {
	let groupedSubmissionQuestionTimes = reduceSubmissionQuestions(groupedAuditData, calculateQuestionTime);
	let submissionTimes = calculateAggregateSubmissionValues(groupedSubmissionQuestionTimes);

	const tag = "submission-times";

	let vegaSpec = {
		title: chartNames[tag],
		width: "container",
		data: {
			values: submissionTimes,
		},
		mark: "bar",
		encoding: {
			x: {
				title: "Submission", field: "instance ID", type: "nominal",
				axis: {
					labelAngle: 0,
				},
			},
			y: {title: "Response Time (seconds)", field: "value", type: "quantitative"},
		},
	};

	vegaEmbed("#" + tag, vegaSpec);
}

// Takes a list of dictionaries with each dictionary corresponding to an event of an ODK audit file
// Returns a dictionary that maps a submission id to events for that submission s.t. events for each submission 
// are listed in a dictionary mapping question name (node) to a list of events for that question
// eg.  {
//			"instanceID1":
//				{
//					"question1": [event, event, event],
//					"question2": [event ,event, event],
//				},
//			"instanceID2": {...},
//      }
// Ignores any events that aren't associated with an instanceID and node (question name)
// Truncates node names to remove "/data/" prefix and truncates instanceIDs to remove "uuid:" prefix
function groupAuditData(auditData) {
	let groupedData = {};
	for (const event of auditData) {
		// cut off "uuid:" portion of instanceID
		let splitInstanceID = event["instance ID"].split(":");
		let instanceID = splitInstanceID[splitInstanceID.length - 1];

		// cut off "/data/" portion of question names
		let splitNode = event["node"].split("/");
		let node = splitNode[splitNode.length - 1];

		// we skip events that aren't associated with an instanceID and a question name
		if (instanceID && node) {
			if (!(instanceID in groupedData)) {
				groupedData[instanceID] = {};
			}

			if (!(node in groupedData[instanceID])) {
				groupedData[instanceID][node] = [];
			}

			groupedData[instanceID][node].push(event);
		}
	}

	return groupedData;
}

// Takes grouped audit dictionary returned by groupAuditData
// Returns a grouped dictionary of the same format s.t. each question is mapped to the result of calling fn on its list of events
// eg.  {
//			"instanceID1":
//				{
//					"question1": fn(events_list1)
//					"question2": fn(events_list2),
//				},
//			"instanceID2": {...},
//      }
function reduceSubmissionQuestions(groupedData, fn) {
	let submissionTimes = {};
	for (const [instanceID, questions] of Object.entries(groupedData)) {
		submissionTimes[instanceID] = {};

		for (const [node, events] of Object.entries(questions)) {
			submissionTimes[instanceID][node] = fn(events);
		}
	}

	return submissionTimes;
}

// Takes submission data in the format returned by reduceSubmissionQuestions
// Returns a list of dictionaries s.t. each dictionary maps "node" to question name and "value" to the average value of that question
// across all submissions
function calculateAverageQuestionValues(groupedSubmissionValues) {
	let questionAggregate = {};
	let questionResponses = {};

	for (const [instanceID, questions] of Object.entries(groupedSubmissionValues)) {
		for (const [node, value] of Object.entries(questions)) {
			if (!(node in questionAggregate)) {
				questionAggregate[node] = 0;
				questionResponses[node] = 0;
			}

			questionAggregate[node] += value;
			questionResponses[node]++;
		}
	}

	let questionAverages = [];
	for (const node of Object.keys(questionAggregate)) {
		let entry = {};
		entry.node = node;
		entry.value = questionAggregate[node] / questionResponses[node];
		questionAverages.push(entry);
	}

	return questionAverages;
}

// Takes submission data in the format returned by reduceSubmissionQuestions
// Returns a list of dictionaries s.t. each dictionary maps "instanceID" to a submission's instanceID and "value" to the aggregate value of all 
// questions for that submission
function calculateAggregateSubmissionValues(groupedSubmissionValues) {
	let submissionAggregate = [];

	for (const [instanceID, questions] of Object.entries(groupedSubmissionValues)) {
		let entry = {};
		entry["instance ID"] = instanceID;
		entry["value"] = 0;

		for (const [node, value] of Object.entries(questions)) {
			entry["value"] += value;
		}

		submissionAggregate.push(entry);
	}

	return submissionAggregate;
}

// Takes a list of events corresponding to a single question in one submission
// Returns the total response time for the question in seconds
function calculateQuestionTime(events) {
	let totalTime = 0;
	for (const event of events) {
		if (event["end"] && event["start"]) {
			totalTime += event["end"] - event["start"];
		}
	}

	// convert time from ms to s
	return (totalTime / 1000);
}

// Takes a list of events corresponding to a single question in one submission
// Returns the total number of times the response to this question is change.
// This count doesn't include when the question is initially filled out.
// Corresponds to the number of entries with a non-null "old-value" field
function calculateQuestionChanges(events) {
	let totalChanges = 0;
	for (const event of events) {
		if (event["old-value"]) {
			totalChanges++;
		}
	}

	return totalChanges;
}