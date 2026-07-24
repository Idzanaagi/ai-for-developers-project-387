# Lighthouse Recommendations

## Calendar (/)

### Performance (85 / 90)

- **Total Blocking Time**
  - Sum of all time periods between FCP and Time to Interactive, when task length exceeded 50ms, expressed in milliseconds. [Learn more about the Total Blocking Time metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocki
- **Document request latency**
  - Your first network request is the most important. [Reduce its latency](https://developer.chrome.com/docs/performance/insights/document-latency) by avoiding redirects, ensuring a fast server response, and enabling text compression.
- **Network dependency tree**
  - [Avoid chaining critical requests](https://developer.chrome.com/docs/performance/insights/network-dependency-tree) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improv
- **Render-blocking requests**
  - Requests are blocking the page's initial render, which may delay LCP. [Deferring or inlining](https://developer.chrome.com/docs/performance/insights/render-blocking) can move these network requests out of the critical path.
- **Max Potential First Input Delay**
  - The maximum potential First Input Delay that your users could experience is the duration of the longest task. [Learn more about the Maximum Potential First Input Delay metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-max-po

### Accessibility (86 / 90)

- **Background and foreground colors do not have a sufficient contrast ratio.**
  - Low-contrast text is difficult or impossible for many users to read. [Learn how to provide sufficient color contrast](https://dequeuniversity.com/rules/axe/4.12/color-contrast).
- **Document does not have a main landmark.**
  - One main landmark helps screen reader users navigate a web page. [Learn more about landmarks](https://dequeuniversity.com/rules/axe/4.12/landmark-one-main).

## Admin (/admin)

All categories pass ✓
