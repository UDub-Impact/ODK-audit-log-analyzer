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

	let groupedSubmissionTimes = calculateSubmissionTimes(groupedData);
	let averageQuestionTimes = calculateAverageQuestionTimes(groupedSubmissionTimes);

	showAverageQuestionTimes(averageQuestionTimes);
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

		// we skip events that aren't associated with an instanceID and a question
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
// Returns a grouped dictionary of the same format s.t. each question is mapped to its total time
// eg.  {
//			"instanceID1":
//				{
//					"question1": time1,
//					"question2": time2,
//				},
//			"instanceID2": {...},
//      }
function calculateSubmissionTimes(groupedData) {
	let submissionTimes = {};
	for (const [instanceID, questions] of Object.entries(groupedData)) {
		submissionTimes[instanceID] = {};

		for (const [node, events] of Object.entries(questions)) {
			submissionTimes[instanceID][node] = calculateQuestionTime(events);
		}
	}

	return submissionTimes;
}

// Takes grouped submission times returned by calculateSubmissionTimes
// Returnes a dictionary mapping question name to the average response time for that question
function calculateAverageQuestionTimes(groupedSubmissionTimes) {
	let questionTime = {};
	let questionResponses = {};

	for (const [instanceID, questions] of Object.entries(groupedSubmissionTimes)) {
		for (const [node, time] of Object.entries(questions)) {
			if (!(node in questionTime)) {
				questionTime[node] = 0;
				questionResponses[node] = 0;
			}

			questionTime[node] += time;
			questionResponses[node]++;
		}
	}

	let questionAverages = {};
	for (const node of Object.keys(questionTime)) {
		questionAverages[node] = questionTime[node] / questionResponses[node];
	}

	return questionAverages;
}

// Takes averageQuestionTimes as returned by calculateAverageQuestionTimes
// Displays average question times in a bar chart
function showAverageQuestionTimes(averageQuestionTimes) {
	// Converts dictionary to a list of dictionaries with node and average attrs
	var mapped = Object.keys(averageQuestionTimes).map(function(node) {
		return {
			node: node,
			average: averageQuestionTimes[node],
		};
	});
	

	var margin = {top: 50, right: 0, bottom: 10, left: 50};
	var width = 600 - margin.left - margin.right;
    var height = 400 - margin.top - margin.bottom;

	var x = d3.scaleBand()
		.range([0, width])
		.round(0.5);
	var y = d3.scaleLinear()
		.range([height, 0]);

	var xAxis = d3.axisTop(x);
	var yAxis = d3.axisLeft(y);
	
	x.domain(mapped.map(d => d.node));
	y.domain([0, d3.max(mapped, d => d.average)]);
	
	// Hard-coded "average-question-time" id here could be changed
	var svg = d3.select("#average-question-time").append("svg")
	    .attr("width", 600)
	    .attr("height", 400)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	

	// Insert graph
	svg.selectAll("bar")
	    .data(mapped)
	    .enter().append("rect")
	      .style("fill", "steelblue")
	      .attr("x", d => x(d.node))
	      .attr("width", width / mapped.length)
	      .attr("y", d => y(d.average))
	      .attr("height", d => height - y(d.average));

	// Insert title text
	svg.append("text")
	  	.attr("x", (width / 2))             
	  	.attr("y", 0 - (margin.top / 2))
	  	.attr("text-anchor", "middle")  
	  	.style("font-size", "16px") 
	  	.text("Average Time Spent on Each Question");

	svg.append("g").call(xAxis);
	svg.append("g").call(yAxis);
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
