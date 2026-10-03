export default function FormSpamTrap({ inputRef }) {
  return (
    <div className="form-spam-trap" aria-hidden="true" inert>
      <label>
        Leave this field empty
        <input
          ref={inputRef}
          type="text"
          name="contact_fax"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
    </div>
  );
}
