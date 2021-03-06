import { PropsList } from "../interfaces/propsInterface";
import { checkZoomBounds, handleCalculatePositions } from "../zoom/utils";
import { handleCalculateBounds } from "../zoom";
import { getDistance, roundNumber } from "../utils";
import { wheelMousePosition } from "../zoom/utils";

function round(number, decimal) {
  const roundNumber = Math.pow(10, decimal);
  return Math.round(number * roundNumber) / roundNumber;
}

function getCurrentDistance(event) {
  return getDistance(event.touches[0], event.touches[1]);
}

function checkIfInfinite(number) {
  return number === Infinity || number === -Infinity;
}

export function calculatePinchZoom(currentDistance, pinchStartDistance) {
  const {
    options: { minScale, maxScale },
    scalePadding: { size, disabled },
  }: PropsList = this.stateProvider;
  if (
    typeof pinchStartDistance !== "number" ||
    typeof currentDistance !== "number"
  )
    return console.error("Pinch touches distance was not provided");

  if (currentDistance < 0) return;
  const touchProportion = currentDistance / pinchStartDistance;
  const scaleDifference = touchProportion * this.pinchStartScale;

  return checkZoomBounds(
    roundNumber(scaleDifference, 2),
    minScale,
    maxScale,
    size,
    !disabled,
  );
}

export function calculateGestureZoom(scale) {
  const {
    options: { minScale, maxScale },
    scalePadding: { size, disabled },
  }: PropsList = this.stateProvider;
  if (typeof scale !== "number")
    return console.error("Pinch gesture scale was not provided");

  if (scale < 0) return;
  const scaleDifference = scale * this.pinchStartScale;

  return checkZoomBounds(
    roundNumber(scaleDifference, 2),
    minScale,
    maxScale,
    size,
    !disabled,
  );
}

export function calculateMidpoint(event, scale, contentComponent) {
  const contentRect = contentComponent.getBoundingClientRect();
  const { touches } = event;
  const firstPointX = round(touches[0].clientX - contentRect.left, 5);
  const firstPointY = round(touches[0].clientY - contentRect.top, 5);
  const secondPointX = round(touches[1].clientX - contentRect.left, 5);
  const secondPointY = round(touches[1].clientY - contentRect.top, 5);

  return {
    mouseX: (firstPointX + secondPointX) / 2 / scale,
    mouseY: (firstPointY + secondPointY) / 2 / scale,
  };
}

export function handleZoomPinch(event) {
  const {
    scale,
    options: { limitToBounds, limitToWrapper },
    scalePadding: { disabled, size },
    wheel: { limitsOnWheel },
    pinch,
  } = this.stateProvider;
  const { contentComponent } = this.state;
  if (pinch.disabled || this.stateProvider.options.disabled) return;

  if (event.cancelable) {
    event.preventDefault();
    event.stopPropagation();
  }

  let mouseX, mouseY, newScale;

  if (event.scale) {
    ({ mouseX, mouseY } = wheelMousePosition(event, contentComponent, scale));
    newScale = calculateGestureZoom.call(this, event.scale);
  } else {
    // Position transformation
    ({ mouseX, mouseY } = calculateMidpoint(event, scale, contentComponent));

    const currentDistance = getCurrentDistance(event);

    newScale = calculatePinchZoom.call(
      this,
      currentDistance,
      this.pinchStartDistance,
    );

    this.lastDistance = currentDistance;
  }

  // if touches goes off of the wrapper element
  if (checkIfInfinite(mouseX) || checkIfInfinite(mouseY)) return;
  if (checkIfInfinite(newScale) || newScale === scale) return;

  // Get new element sizes to calculate bounds
  const bounds = handleCalculateBounds.call(this, newScale, limitToWrapper);

  // Calculate transformations
  const isLimitedToBounds =
    limitToBounds && (disabled || size === 0 || limitsOnWheel);

  const { x, y } = handleCalculatePositions.call(
    this,
    mouseX,
    mouseY,
    newScale,
    bounds,
    isLimitedToBounds,
  );

  this.stateProvider.positionX = x;
  this.stateProvider.positionY = y;
  this.stateProvider.scale = newScale;
  this.stateProvider.previousScale = scale;

  // update component transformation
  this.applyTransformation();
}
