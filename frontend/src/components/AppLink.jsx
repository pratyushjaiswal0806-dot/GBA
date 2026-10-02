import { navigate } from '../routing.js';

export function AppLink({ href, children, className, onClick, ...props }) {
  function handleClick(event) {
    onClick?.(event);

    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || props.target
      || props.download
    ) {
      return;
    }

    event.preventDefault();
    navigate(href);
  }

  return <a {...props} className={className} href={href} onClick={handleClick}>{children}</a>;
}
