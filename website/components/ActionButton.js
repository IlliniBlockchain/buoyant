import styles from "../styles/Components.module.css"

function ActionButton({label, loading, clickHandler}) {

  return (
    <button className={loading ? styles.btnOrange : ""} onClick={loading ? () => {} : clickHandler}>
      {loading == true ? (
        <img className={styles.loading} src={"./images/loading.svg"} />
      ) : (
        label
      )}
    </button>
  )
}

export default ActionButton;