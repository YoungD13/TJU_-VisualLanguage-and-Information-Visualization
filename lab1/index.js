async function updatingBars() {
  const dataset = await d3.json('./data/weather.json');

  const width = 600;
  let dimensions = {
    width: width,
    height: width * 0.6,
    margin: {
      top: 30,
      right: 10,
      bottom: 90, // 增加底部空间以容纳标签
      left: 50,
    },
  };
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  const wrapper = d3
    .select('#wrapper')
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height);

  const bounds = wrapper
    .append('g')
    .style(
      'transform',
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  bounds.append('g').attr('class', 'bins');
  bounds
    .append('g')
    .attr('class', 'x-axis')
    .style('transform', `translateY(${dimensions.boundedHeight}px)`)
    .append('text')
    .attr('class', 'x-axis-label')
    .attr('x', dimensions.boundedWidth / 2)
    .attr('y', dimensions.margin.bottom - 10);

  const tooltip = d3.select('body')
    .append('div')
    .attr('id', 'tooltip');

  // 添加标签元素
  const metricLabel = wrapper
    .append('text')
    .attr('id', 'metric-label')
    .attr('x', dimensions.width / 2)
    .attr('y', dimensions.height - 20) // 标签位置在柱状图下方
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('fill', 'black');

  const drawHistogram = (metric) => {
    const metricAccessor = (d) => d[metric];
    const yAccessor = (d) => d.length;

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(dataset, metricAccessor))
      .range([0, dimensions.boundedWidth])
      .nice();

    const binsGenerator = d3
      .histogram()
      .domain(xScale.domain())
      .value(metricAccessor)
      .thresholds(12);

    const bins = binsGenerator(dataset);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, yAccessor)])
      .range([dimensions.boundedHeight, 0])
      .nice();

    const barPadding = 1;

    const exitTransition = d3.transition().duration(600);
    const updateTransition = exitTransition.transition().duration(600);

    let binGroups = bounds.select('.bins').selectAll('.bin').data(bins);

    const oldBinGroups = binGroups.exit();

    oldBinGroups.selectAll('rect')
      .style('fill', 'red')
      .transition(exitTransition)
      .attr('y', dimensions.boundedHeight)
      .attr('height', 0);

    oldBinGroups.selectAll('text')
      .transition(exitTransition)
      .attr('y', dimensions.boundedHeight);

    oldBinGroups.transition(exitTransition).remove();

    const newBinGroups = binGroups.enter().append('g').attr('class', 'bin');

    newBinGroups
      .append('rect')
      .attr('height', 0)
      .attr('x', (d) => xScale(d.x0) + barPadding)
      .attr('y', dimensions.boundedHeight)
      .attr('width', (d) =>
        d3.max([0, xScale(d.x1) - xScale(d.x0) - barPadding])
      )
      .style('fill', 'yellowgreen');

    newBinGroups
      .append('text')
      .attr('x', (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
      .attr('y', dimensions.boundedHeight);

    binGroups = newBinGroups.merge(binGroups);

    binGroups
      .select('rect')
      .transition(updateTransition)
      .attr('x', (d) => xScale(d.x0) + barPadding)
      .attr('y', (d) => yScale(yAccessor(d)))
      .attr('height', (d) => dimensions.boundedHeight - yScale(yAccessor(d)))
      .attr('width', (d) =>
        d3.max([0, xScale(d.x1) - xScale(d.x0) - barPadding])
      )
      .transition()
      .style('fill', 'cornflowerblue');

    binGroups
      .selectAll('rect')
      .on('mouseover', onMouseEnter)
      .on('mouseleave', onMouseLeave);

    function onMouseEnter(event, d) {
      d3.select(this).style('fill', 'orange');
      tooltip
        .style('left', `${event.pageX}px`)
        .style('top', `${event.pageY - 30}px`)
        .style('opacity', 1.0)
        .html(`${d.length} days`);
    }

    function onMouseLeave() {
      d3.select(this).style('fill', 'cornflowerblue');
      tooltip.style('opacity', 0.0);
    }

    const xAxisGenerator = d3.axisBottom().scale(xScale);
    bounds.select('.x-axis').transition(updateTransition).call(xAxisGenerator);

    bounds.select('.x-axis-label').text(metric);

    // 更新标签内容
    metricLabel.text(metric);
  };

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
  let selectedMetricIndex = 0;
  drawHistogram(metrics[selectedMetricIndex]);

  const button = d3.select('#change-metric').text('Change metric');

  button.node().addEventListener('click', () => {
    selectedMetricIndex = (selectedMetricIndex + 1) % metrics.length;
    drawHistogram(metrics[selectedMetricIndex]);
  });
}

updatingBars();