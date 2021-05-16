// Creates input element that allows user to select audit file and analyzes selected file
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
      		processAuditFile(auditStr);
    	}
    }

	input.click();
}

// Takes String contents of CSV audit file, parses and processes it, and updates page to show insights
function processAuditFile(auditStr) {
	// auditData is a list of dictionaries s.t. each dictionary represents a row of the original audit CSV data
	let auditData = d3.csvParse(auditStr);

	// rows of the original CSV audit have events from many different submissions jumbled together
	// this function groups all events by submission
	// this gives us a dictionary that maps submission id to events for that submission
	let groupedData = groupAuditData(auditData);

	// the first function here keeps the data in a similar format to groupedData but maps question names to
	// the time spent responding to that question (rather than a list of events)
	let groupedSubmissionTimes = reduceSubmissionQuestions(groupedData, calculateQuestionTime);
	// this function takes submission ids out of the picture and calculates the average time spent responding to
	// each question across submissions
	let averageQuestionTimes = calculateAverageQuestionValues(groupedSubmissionTimes);

	let groupedSubmissionQuestionChanges = reduceSubmissionQuestions(groupedData, calculateQuestionChanges);
	let averageQuestionChanges = calculateAverageQuestionValues(groupedSubmissionQuestionChanges);

	showAverageQuestionTimes(averageQuestionTimes);
	showAverageQuestionChanges(averageQuestionChanges);
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
function groupAuditData(auditData) {
	let groupedData = {};
	for (const event of auditData) {
		let instanceID = event["instanceID"];
		let node = event["node"];

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
function calculateAverageQuestionValues(groupedSubmissionTimes) {
	let questionAggregate = {};
	let questionResponses = {};

	for (const [instanceID, questions] of Object.entries(groupedSubmissionTimes)) {
		for (const [node, time] of Object.entries(questions)) {
			if (!(node in questionAggregate)) {
				questionAggregate[node] = 0;
				questionResponses[node] = 0;
			}

			questionAggregate[node] += time;
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

// Takes a list of events corresponding to a single question in one submission
// Returns the total response time for the question
function calculateQuestionTime(events) {
	let totalTime = 0;
	for (const event of events) {
		if (event["end"] && event["start"]) {
			totalTime += event["end"] - event["start"];
		}
	}

	return totalTime;
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

// Takes average question times in the format returned by calculateAverageQuestionValues
// Displays average question times in a bar chart
function showAverageQuestionTimes(averageQuestionTimes) {
	let vegaSpec = {
		title: "Average Time Spent Responding Per Question",
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
			y: {title: "Average Response Time", field: "value", type: "quantitative"},
		},
	};

	vegaEmbed("#average-question-time", vegaSpec);
}

// Takes average question changes in the format returned by calculateAverageQuestionValues
// Displays average question changes in a bar chart
function showAverageQuestionChanges(averageQuestionChanges) {
	let vegaSpec = {
		title: "Average Number of Response Changes Per Question",
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

	vegaEmbed("#average-question-changes", vegaSpec);
}