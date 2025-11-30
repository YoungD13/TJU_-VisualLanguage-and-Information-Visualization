async function drawChart() {
    const data = await d3.json('./data/weather.json');

    const metrics = [
        'windSpeed',
        'moonPhase',
        'dewPoint',
        'humidity',
        'uvIndex',
        'windBearing',
        'temperatureMin',
        'temperatureMax',
    ];
    let currentMetricIndex = 0;

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 50, left: 40 };

    const svg = d3.select('#wrapper')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const xAxisGroup = svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`);

    const yAxisGroup = svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`);

    const tooltip = d3.select('#wrapper')
        .append('div')
        .attr('id', 'tooltip');

    const render = (metric) => {
        const values = data.map(d => d[metric]);
        const bins = d3.bin().thresholds(10)(values);

        const xScale = d3.scaleLinear()
            .domain([bins[0].x0, bins[bins.length - 1].x1])
            .range([margin.left, width - margin.right]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([height - margin.bottom, margin.top]);

        const bars = svg.selectAll('.bar')
            .data(bins);

        // Exit transition for removed bars
        bars.exit()
            .transition()
            .duration(600)
            .attr('y', height - margin.bottom)
            .attr('height', 0)
            .attr('fill', 'red')
            .remove();

        // Enter transition for new bars
        const newBars = bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.x0))
            .attr('y', height - margin.bottom)
            .attr('width', d => xScale(d.x1) - xScale(d.x0) - 1)
            .attr('height', 0)
            .attr('fill', 'yellowgreen');

        newBars.merge(bars)
            .transition()
            .duration(600)
            .attr('x', d => xScale(d.x0))
            .attr('y', d => yScale(d.length))
            .attr('width', d => xScale(d.x1) - xScale(d.x0) - 1)
            .attr('height', d => height - margin.bottom - yScale(d.length))
            .attr('fill', 'steelblue');

        // Add mouse interaction
        svg.selectAll('.bar')
            .on('mouseover', (event, d) => {
                d3.select(event.target).attr('fill', 'orange');
                tooltip.style('opacity', 1)
                    .style('left', `${event.pageX}px`)
                    .style('top', `${event.pageY - 30}px`)
                    .html(`${d.length} days`);
            })
            .on('mouseout', (event) => {
                d3.select(event.target).attr('fill', 'steelblue');
                tooltip.style('opacity', 0);
            });

        // Update axes
        const xAxis = d3.axisBottom(xScale);
        xAxisGroup.transition().duration(600).call(xAxis);

        const yAxis = d3.axisLeft(yScale);
        yAxisGroup.transition().duration(600).call(yAxis);
    };

    render(metrics[currentMetricIndex]);

    d3.select('#change-metric').on('click', () => {
        currentMetricIndex = (currentMetricIndex + 1) % metrics.length;
        render(metrics[currentMetricIndex]);
    });
}

drawChart();