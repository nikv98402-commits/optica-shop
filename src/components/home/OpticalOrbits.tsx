const orbitCount = 3;
const particleCount = 5;

export function OpticalOrbits() {
  return (
    <div className="optical-orbits" aria-hidden="true">
      <div className="optical-orbits__halo" />
      {Array.from({ length: orbitCount }, (_, index) => (
        <span className={`optical-orbits__track optical-orbits__track--${index + 1}`} key={index}>
          <i className="optical-orbits__satellite" />
        </span>
      ))}
      {Array.from({ length: particleCount }, (_, index) => (
        <i className={`optical-orbits__particle optical-orbits__particle--${index + 1}`} key={index} />
      ))}
    </div>
  );
}
