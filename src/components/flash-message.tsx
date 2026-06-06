type FlashMessageProps = {
  error?: string | string[];
  success?: string | string[];
};

function valueToText(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function FlashMessage({ error, success }: FlashMessageProps) {
  const errorText = valueToText(error);
  const successText = valueToText(success);

  if (!errorText && !successText) {
    return null;
  }

  return (
    <>
      {errorText ? <div className="alert alert-error">{errorText}</div> : null}
      {successText ? <div className="alert alert-success">{successText}</div> : null}
    </>
  );
}
